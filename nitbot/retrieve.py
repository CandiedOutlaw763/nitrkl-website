"""Hybrid retrieval: BM25 (SQLite FTS5) + dense vectors, fused with reciprocal rank fusion, then a
cross-encoder reranks the fused candidates. Keyword search matters here: course codes (CS3201),
abbreviations (NIRF, CDC) and names are matched poorly by embeddings alone.
"""
import re
import sqlite3
import threading
import zlib
from datetime import date

import numpy as np

from . import config
from .packfiles import pack_dir

RRF_K = 60
CANDIDATES = 40         # from each of keyword and vector search
RERANK_CANDIDATES = 20  # fused candidates the cross-encoder re-scores (it dominates query latency on CPU)
RERANK_WORDS = 150
BLEND_K = 10            # rank-fusion constant for blending the search order with the reranker order
MAX_PER_DOC = 2
# Uploaded files sit in folders such as /docs/CEP/ (about 1,000 event brochures) and /docs/Tenders/.
# Brochures each repeat an "About NIT Rourkela" paragraph (director, NIRF rank, programmes, often
# years out of date), so one folder could fill every slot and push the official pages out.
# Each search takes at most MAX_PER_GROUP hits from one /docs/<folder>/ out of a wider POOL.
MAX_PER_GROUP = 4
POOL = 400
GROUP_RE = re.compile(r"(/docs/[^/]+)/.")
# The site's notice board (current fee tables, admission notices, results) gets more room.
GROUP_CAPS = {"/docs/announcement": 6}
# Folders holding the same kind of document count as one group.
GROUP_ALIASES = {"/docs/cep": "events", "/docs/workshop": "events", "/docs/conference": "events"}
# In the k results passed to the model, bulk folders of near-identical documents get at most 2 slots.
MAX_PER_GROUP_FINAL = 2
FINAL_CAPPED_GROUPS = ("events", "/docs/tenders")

# Ranking priors. Old uploads (fee tables, calendars, brochures quoting old ranks) stay on the site,
# so a document loses AGE_PER_YEAR of its score per year of age, down to AGE_FLOOR. Not applied when
# the question names a year. HTML pages are maintained in place and count as current.
# Event brochures rank a little below the institute's own pages.
AGE_PER_YEAR = 0.05
AGE_FLOOR = 0.7
EVENT_WEIGHT = 0.85
# Uploads are named after their upload time: /docs/Announcement/10072026175422922.pdf = 10 Jul 2026.
STAMP_RE = re.compile(r"/(\d{2})(\d{2})(20\d{2})\d{6,9}[a-z]?(?:_\d+)?\.\w+$")
FOLDER_YEAR_RE = re.compile(r"(?<!\d)((?:19|20)\d{2})(?:-(\d{2}))?(?!\d)")  # /2025-26/, /NIRF2019/
YEAR_RE = re.compile(r"\b((?:19|20)\d{2})(?:\s*[-–]\s*(\d{2})\b)?")


# The site writes departments and posts out in full; people ask with abbreviations, which neither search sees through.
ABBREVIATIONS = {
    "cse": "Computer Science and Engineering", "ece": "Electronics and Communication Engineering",
    "eee": "Electrical Engineering", "mech": "Mechanical Engineering", "hod": "Head of the Department",
    "hods": "Heads of Department",
}
ABBREVIATION_RE = re.compile(r"\b(" + "|".join(ABBREVIATIONS) + r")\b", re.I)


def expand_abbreviations(q: str) -> str:
    return ABBREVIATION_RE.sub(lambda m: f"{m.group(1)} {ABBREVIATIONS[m.group(1).lower()]}", q)


def doc_year(key: str, title: str) -> float:
    """When a document dates from, as a fractional year; 0 if unknown (HTML pages: always 0)."""
    if not key.startswith(("/docs/", "data:")):
        return 0.0
    m = STAMP_RE.search(key)
    if m and 1 <= int(m.group(1)) <= 31 and 1 <= int(m.group(2)) <= 12:
        return int(m.group(3)) + (int(m.group(2)) - 1) / 12
    found = list(FOLDER_YEAR_RE.finditer(key.rsplit("/", 1)[0])) or list(YEAR_RE.finditer(title or ""))
    # "2025-26" is the academic year ending in 2026.
    years = [int(y) + (1 if nxt else 0) for y, nxt in (x.groups() for x in found)]
    return float(max(years)) if years else 0.0

STOPWORDS = set(
    "a an and are as at be by can do does for from has have how i in is it me my of on or our please "
    "tell the this to was what when where which who why will with you your about give list show".split()
)


def _fts_query(q: str) -> str | None:
    tokens = [t for t in re.findall(r"[\w.]+", q.lower()) if t not in STOPWORDS and len(t) > 1]
    tokens = [t.strip(".") for t in tokens if t.strip(".")]
    if not tokens:
        return None
    return " OR ".join(f'"{t}"' for t in dict.fromkeys(tokens))


class _FastembedQuery:
    """fastembed's embedder behind the same embed(list) -> matrix call as onnx_models.Embedder."""
    def __init__(self):
        from fastembed import TextEmbedding
        self.model = TextEmbedding(config.EMBED_MODEL, cache_dir=str(config.MODEL_DIR))

    def embed(self, texts: list[str]) -> np.ndarray:
        return np.asarray(list(self.model.embed(texts)), dtype=np.float32)


class _FastembedRerank:
    def __init__(self):
        from fastembed.rerank.cross_encoder import TextCrossEncoder
        self.model = TextCrossEncoder(config.RERANK_MODEL, cache_dir=str(config.MODEL_DIR))

    def rerank(self, query: str, passages: list[str]) -> list[float]:
        return [float(x) for x in self.model.rerank(query, passages)]


class Retriever:
    def __init__(self):
        pack = pack_dir()
        db = pack / "serve.sqlite" if pack else config.DB_PATH
        self.con = sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True, check_same_thread=False)
        self.con.row_factory = sqlite3.Row
        self.lock = threading.Lock()  # one shared connection; queries are short
        if pack:  # the serving pack: int8 vectors, onnxruntime models (see nitbot.pack)
            from .onnx_models import Embedder, Reranker
            v = np.load(pack / "vectors.npz")
            self.matrix = v["q"].astype(np.float32) * v["scale"][:, None]
            self.embedder = Embedder(pack / "models" / "embed", "model_optimized.onnx")
            self.reranker = Reranker(pack / "models" / "rerank", "model.onnx") if config.RERANK else None
        else:
            self.matrix = np.load(config.EMB_PATH)
            self.embedder = _FastembedQuery()
            self.reranker = _FastembedRerank() if config.RERANK else None
        groups: dict[str, int] = {}
        years: dict[str, float] = {}
        self.group = np.zeros(len(self.matrix) + 1, dtype=np.int32)  # chunk id -> folder number, 0 = none
        self.year = np.zeros(len(self.matrix) + 1, dtype=np.float32)  # chunk id -> document year, 0 = current
        for cid, key, title in self.con.execute("SELECT c.id, d.key, d.title FROM chunks c JOIN docs d ON d.id = c.doc_id"):
            if cid >= len(self.group):
                continue
            m = GROUP_RE.match(key)
            if m:
                name = GROUP_ALIASES.get(m.group(1), m.group(1))
                self.group[cid] = groups.setdefault(name, len(groups) + 1)
            if key not in years:
                years[key] = doc_year(key, title)
            self.year[cid] = years[key]
        self.events_group = groups.get("events", -1)
        self.group_cap = {groups[g]: cap for g, cap in GROUP_CAPS.items() if g in groups}
        self.final_capped = {groups[g] for g in FINAL_CAPPED_GROUPS if g in groups}

    def _prior(self, cid: int, use_age: bool) -> float:
        if cid >= len(self.group):
            return 1.0
        weight = EVENT_WEIGHT if self.group[cid] == self.events_group else 1.0
        year = float(self.year[cid])
        if use_age and year:
            now = date.today().year + (date.today().month - 1) / 12
            weight *= max(AGE_FLOOR, 1 - AGE_PER_YEAR * max(0.0, now - year))
        return weight

    def _diverse(self, ids: list[int], n: int) -> list[int]:
        out, per_group = [], {}
        for cid in ids:
            g = int(self.group[cid]) if cid < len(self.group) else 0
            if g:
                if per_group.get(g, 0) >= self.group_cap.get(g, MAX_PER_GROUP):
                    continue
                per_group[g] = per_group.get(g, 0) + 1
            out.append(cid)
            if len(out) >= n:
                break
        return out

    def _dense(self, query: str, n: int) -> list[int]:
        q = self.embedder.embed([config.EMBED_QUERY_PREFIX + query])[0].astype(np.float32)
        q /= np.linalg.norm(q) or 1.0
        scores = self.matrix @ q
        top = np.argpartition(-scores, min(n, len(scores) - 1))[:n]
        return [int(i) + 1 for i in top[np.argsort(-scores[top])]]  # chunk id = row + 1

    def _keyword(self, query: str, n: int) -> list[int]:
        fts = _fts_query(query)
        if not fts:
            return []
        with self.lock:
            rows = self.con.execute(
                "SELECT rowid FROM chunks_fts WHERE chunks_fts MATCH ? ORDER BY bm25(chunks_fts, 1.0, 2.0, 3.0) LIMIT ?",
                (fts, n),
            ).fetchall()
        return [r[0] for r in rows]

    def _load(self, ids: list[int]) -> dict[int, dict]:
        if not ids:
            return {}
        with self.lock:
            rows = self.con.execute(
                f"""SELECT c.id, c.heading, c.text, d.title, d.url, d.kind, d.section, d.breadcrumb
                    FROM chunks c JOIN docs d ON d.id = c.doc_id WHERE c.id IN ({','.join('?' * len(ids))})""",
                ids,
            ).fetchall()
        out = {}
        for r in rows:
            d = dict(r)
            if isinstance(d["text"], bytes):  # the serving pack stores chunk text compressed
                d["text"] = zlib.decompress(d["text"]).decode("utf-8")
            out[d["id"]] = d
        return out

    def search(self, query: str, k: int = 6) -> list[dict]:
        query = expand_abbreviations(query)
        fused: dict[int, float] = {}
        for ranking in (self._keyword(query, POOL), self._dense(query, POOL)):
            ranking = self._diverse(ranking, CANDIDATES)
            for rank, cid in enumerate(ranking):
                fused[cid] = fused.get(cid, 0.0) + 1.0 / (RRF_K + rank)
        use_age = not YEAR_RE.search(query)  # "fees 2019-20" asks for an old document on purpose
        prior = {c: self._prior(c, use_age) for c in fused}
        fused = {c: s * prior[c] for c, s in fused.items()}
        candidates = sorted(fused, key=fused.get, reverse=True)[:RERANK_CANDIDATES if self.reranker else CANDIDATES]
        rows = self._load(candidates)
        candidates = [c for c in candidates if c in rows]
        if not candidates:
            return []
        if self.reranker:
            passages = [
                f"{rows[c]['title']} | {rows[c]['heading']}\n" + " ".join(rows[c]["text"].split()[:RERANK_WORDS])
                for c in candidates
            ]
            rerank_scores = self.reranker.rerank(query, passages)
            by_rerank = [c for _, c in sorted(zip(rerank_scores, candidates), reverse=True)]
            # Blend instead of trusting the cross-encoder alone: it under-rates list-like pages
            # (deans, contacts, programme tables) that both searches rank highly.
            scores = [1 / (BLEND_K + i) + 1 / (BLEND_K + by_rerank.index(c)) for i, c in enumerate(candidates)]
        else:
            scores = [fused[c] for c in candidates]
        ranked = sorted(((c, s * prior[c]) for c, s in zip(candidates, scores)), key=lambda x: x[1], reverse=True)

        results, per_doc, per_group = [], {}, {}
        for cid, score in ranked:
            r = rows[cid]
            g = int(self.group[cid]) if cid < len(self.group) else 0
            g = g if g in self.final_capped else 0
            if per_doc.get(r["url"], 0) >= MAX_PER_DOC or (g and per_group.get(g, 0) >= MAX_PER_GROUP_FINAL):
                continue
            per_doc[r["url"]] = per_doc.get(r["url"], 0) + 1
            if g:
                per_group[g] = per_group.get(g, 0) + 1
            results.append({
                "chunk_id": cid, "score": round(score, 4), "title": r["title"], "url": r["url"],
                "heading": r["heading"], "section": r["section"], "kind": r["kind"], "text": r["text"],
            })
            if len(results) >= k:
                break
        return results
