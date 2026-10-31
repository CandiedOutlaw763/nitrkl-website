"""A directory of NIT Rourkela's people, for questions a handful of search results cannot answer.

Search hands the model six text fragments. That suits "what does this page say", but not "list every
faculty member of CSE" (four listing pages), "who works on image processing" (one line on each of
many profiles) or a misspelt name. Like the placement tables, this is structured data with exact answers.

Sources (all public), fetched when the directory is built, so it is current to that day:
  /FacultyStaff/Faculty, /FacultyStaff/Staff   everyone, all pages
  /<dept>/Faculty                              the faculty of each department
  /Institute/HOD/                              the Heads of Department
  /<dept>/~<user>/                             profiles: research group, areas of interest, contact
                                               (from the crawl; fetched only if the crawl lacks one)

    python -m nitbot.people [database]         build the table (default: the full database)
    python -m nitbot.people --check            the regression checks

Run after `extract`; `python -m nitbot.pack` copies the table into the serving pack.
"""
import difflib
import re
import sqlite3
import sys
from collections import Counter

from . import config

SCHEMA = """
DROP TABLE IF EXISTS people;
CREATE TABLE people(
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL, designation TEXT, kind TEXT NOT NULL,  -- faculty | staff
    dept TEXT, dept_name TEXT,
    email TEXT, phone TEXT, room TEXT,
    research_group TEXT, interests TEXT, biography TEXT,
    profile_url TEXT, listing_url TEXT,
    head_of TEXT                                               -- department code, for a Head of Department
);
"""

CARD_RE = re.compile(r'<h5[^>]*>\s*(?:<a[^>]*href="([^"]*)"[^>]*>)?\s*([^<]+?)\s*(?:</a>)?\s*<small>\s*([^<]*?)\s*</small>\s*</h5>', re.S)
HOD_RE = re.compile(r"<legend>\s*(.*?)\s*</legend>(.*?)</fieldset>", re.S)
EMAIL_RE = re.compile(r"[\w.+-]+@nitrkl\.ac\.in", re.I)
PHONE_RE = re.compile(r"\b0661[\s-]*(?:\d[\s-]*){6}\d")  # the Rourkela code and seven digits
MAX_LISTING_PAGES = 80
OFFICE_MAILBOXES = {"sricce", "registrar", "director", "dean", "info", "office", "admin", "webmaster", "cdc", "acad", "academic"}
GENERIC_PAGE_RE = re.compile(r"(?i)\b(our team|staff|fellowship|home|people)\b")


def _section(text: str, heading: str) -> str:
    """The lines under a "##### heading", up to the next heading."""
    m = re.search(rf"^#+ *{heading}[^\n]*\n(.*?)(?=^#|\Z)", text, re.S | re.M | re.I)
    return m.group(1).strip() if m else ""


def _bullets(block: str) -> str:
    return "; ".join(l.lstrip("- ").strip() for l in block.splitlines() if l.strip())


def parse_profile(title: str, text: str) -> dict:
    """Pages read "Name Designation, Department" in the title, with a block of labelled sections."""
    room = re.search(r"Room Number:\s*([^\n]+)", text)
    dept_name = title.rsplit(",", 1)[1].strip() if title and "," in title else ""
    email = EMAIL_RE.search(text)
    phone = PHONE_RE.search(text)
    return {
        "dept_name": dept_name,
        "email": email.group(0) if email else "",
        "phone": re.sub(r"\s+", " ", phone.group(0)).strip() if phone else "",
        "room": room.group(1).strip() if room else "",
        "research_group": _bullets(_section(text, "Research Group")),
        "interests": _bullets(_section(text, "Areas of Interest")),
        "biography": re.sub(r"\s+", " ", _section(text, "BIOGRAPHY"))[:800],
    }


def build(db_path: str | None = None) -> None:
    import time

    import httpx

    from .extract import parse_html

    root = config.SITE_ROOT
    con = sqlite3.connect(db_path or config.DB_PATH, timeout=60)
    full = sqlite3.connect(f"file:{config.DB_PATH.as_posix()}?mode=ro", uri=True)
    client = httpx.Client(timeout=45, headers={"User-Agent": config.USER_AGENT}, follow_redirects=True)

    def get(path: str) -> str:
        time.sleep(config.CRAWL_DELAY)
        return client.get(path if path.startswith("http") else root + path).text

    def listing(path: str) -> list[tuple[str, str, str]]:
        cards, seen = [], set()
        for n in range(1, MAX_LISTING_PAGES + 1):
            found = CARD_RE.findall(get(f"{path}?pageNumber={n}"))
            fresh = [c for c in found if (c[1], c[2]) not in seen]
            if not fresh:
                break
            seen.update((c[1], c[2]) for c in fresh)
            cards += fresh
        return cards

    people: dict[str, dict] = {}

    def add(url: str, name: str, designation: str, kind: str, dept: str, source: str) -> dict:
        url = url.replace("http://", "https://", 1)  # listings mix the two, for the same profile
        key = url.rstrip("/").lower() if "~" in url else f"{name.lower()}|{designation.lower()}"
        p = people.setdefault(key, {"name": name, "designation": designation, "kind": kind, "dept": dept,
                                    "profile_url": url if "~" in url else "", "listing_url": source})
        if dept and source.endswith(f"/{dept}/Faculty"):  # the department's own page is the better citation
            p["dept"], p["listing_url"] = dept, source
        return p

    code_of = lambda url: (re.search(r"nitrkl\.ac\.in/([^/]+)/~", url) or [None, ""])[1]
    for url, name, des in listing("/FacultyStaff/Faculty"):
        add(url, name, des, "faculty", code_of(url), f"{root}/FacultyStaff/Faculty/")
    print(f"institute faculty listing: {len(people)}")
    for dept in sorted({p["dept"] for p in people.values() if p["dept"]}):
        cards = listing(f"/{dept}/Faculty")
        for url, name, des in cards:
            add(url, name, des, "faculty", dept, f"{root}/{dept}/Faculty")
        print(f"  {dept}: {len(cards)}")
    before = len(people)
    for url, name, des in listing("/FacultyStaff/Staff"):
        add(url, name, des, "staff", code_of(url), f"{root}/FacultyStaff/Staff/")
    print(f"staff: {len(people) - before}")

    crawled = {u.rstrip("/").lower(): (t, x) for u, t, x in full.execute(
        "SELECT url, title, text FROM docs WHERE url GLOB 'https://www.nitrkl.ac.in/*/~*'")}
    fetched = 0
    for p in people.values():
        if not p["profile_url"]:
            continue
        hit = crawled.get(p["profile_url"].rstrip("/").lower())
        if not hit:
            try:
                r = client.get(p["profile_url"])
                time.sleep(config.CRAWL_DELAY)
                if r.status_code == 200:
                    title, _, text, _ = parse_html(r.content, p["profile_url"])
                    hit, fetched = (title, text), fetched + 1
            except httpx.HTTPError as e:
                print(f"  could not fetch {p['profile_url']}: {e!r}")
        if hit:
            p.update(parse_profile(*hit))
    print(f"profiles: {len(crawled)} from the crawl, {fetched} fetched")

    # Most staff have no profile, and the staff listing gives no contact. The page of their section or
    # centre does: "Chiranjib Chowdhury Technical Assistant [SG-II] 0661 246 2757 chowdhuryc@nitrkl.ac.in".
    contacts = 0
    shared = {n for n, c in Counter(p["name"].lower() for p in people.values()).items() if c > 1}
    for p in people.values():
        if p["kind"] != "staff" or p["profile_url"] or p["name"].lower() in shared:  # same name: no telling whose contact it is
            continue
        query = '"' + p["name"].replace('"', "") + '"'
        try:
            rows = full.execute(
                "SELECT c.text, d.url, d.title FROM chunks_fts f JOIN chunks c ON c.id = f.rowid JOIN docs d ON d.id = c.doc_id "
                "WHERE chunks_fts MATCH ? AND d.kind = 'html' AND d.url NOT LIKE '%/FacultyStaff/%' LIMIT 25", (query,)).fetchall()
        except sqlite3.OperationalError:
            continue
        for text, url, title in rows:
            m = re.search(re.escape(p["name"]) + r"(?P<near>.{0,160}?)(?P<email>[\w.+-]+@nitrkl\.ac\.in)", text, re.S | re.I)
            if not m or re.search(r"(?i)professor", m.group("near")) or m.group("email").split("@")[0].lower() in OFFICE_MAILBOXES:
                continue
            phone = PHONE_RE.search(re.sub(r"\s+", " ", m.group("near")))
            p["email"], p["listing_url"] = m.group("email"), url
            p["phone"] = phone.group(0).strip() if phone else ""
            unit = re.sub(r"^NIT Rourkela\s*-?\s*", "", title or "").strip()
            p["dept_name"] = "" if GENERIC_PAGE_RE.search(unit) else unit
            contacts += 1
            break
    print(f"staff contacts found on section pages: {contacts}")

    # A department's name, from the profiles that state it; other members of the department take it too.
    names: dict[str, dict[str, int]] = {}
    for p in people.values():
        if p["dept"] and p.get("dept_name"):
            names.setdefault(p["dept"], {}).setdefault(p["dept_name"], 0)
            names[p["dept"]][p["dept_name"]] += 1
    for p in people.values():
        if p["dept"] in names and not p.get("dept_name"):
            p["dept_name"] = max(names[p["dept"]], key=names[p["dept"]].get)

    # Heads of Department: their office email (hod-cs@...) gives the code.
    heads = 0
    for legend, block in HOD_RE.findall(get("/Institute/HOD/")):
        cards = re.search(r"<h5[^>]*>\s*([^<]+?)\s*<small>\s*([^<]*?)\s*</small>", block)
        office = re.search(r"hod-(\w+)@nitrkl\.ac\.in", block, re.I)
        if not (cards and office):
            continue
        name, code = re.sub(r"\s+", " ", cards.group(1)), office.group(1).upper()
        match = [p for p in people.values() if p["name"].lower() == name.lower() and p["kind"] == "faculty"]
        same_dept = [p for p in match if p["dept"] == code]
        p = (same_dept or match or [None])[0]
        if p is None:
            p = add("", name, cards.group(2), "faculty", code, f"{root}/{code}/Faculty")
            p["dept_name"] = re.sub(r"\s+", " ", legend)
        p["head_of"] = code
        phone = PHONE_RE.search(block)
        if phone:  # the office line, which the profile may not show
            p["phone"] = re.sub(r"\s+", " ", phone.group(0)).strip()
        p["email"] = p.get("email") or office.group(0)
        p["head_email"] = office.group(0)
        heads += 1
    print(f"heads of department: {heads}")

    con.executescript(SCHEMA)
    cols = ("name", "designation", "kind", "dept", "dept_name", "email", "phone", "room", "research_group",
            "interests", "biography", "profile_url", "listing_url", "head_of")
    con.executemany(f"INSERT INTO people({','.join(cols)}) VALUES ({','.join('?' * len(cols))})",
                    [tuple(p.get(c) or "" for c in cols) for p in people.values()])
    con.commit()
    print(f"people: {len(people)} in {db_path or config.DB_PATH}")


# ---- answering -------------------------------------------------------------------------------------

# Common ways of naming a department. Two-letter codes count only in capitals ("ME" yes, "me" no).
DEPT_ALIASES = {
    "CS": ("cse", "computer science", "computer engineering", "computer sc", "cs department", "cs dept", "cs and e", "cs&e"),
    "EC": ("ece", "electronics", "electronics and communication", "e&c", "etc"),
    "EE": ("electrical", "eee"),
    "ME": ("mechanical", "mech"),
    "CE": ("civil",),
    "CH": ("chemical engineering", "chemical"),
    "CY": ("chemistry",),
    "PH": ("physics", "astronomy"),
    "MA": ("mathematics", "maths", "math"),
    "MM": ("metallurgical", "metallurgy", "materials engineering"),
    "MN": ("mining",),
    "CR": ("ceramic",),
    "BM": ("biotechnology", "biomedical", "medical engineering", "biotech"),
    "FP": ("food process", "food"),
    "LS": ("life science", "life sciences"),
    "HS": ("humanities", "social sciences"),
    "SM": ("school of management", "management"),
    "PA": ("planning and architecture", "architecture"),
    "ID": ("industrial design",),
    "ER": ("earth and atmospheric", "atmospheric", "earth science"),
}
TITLES = {"prof", "professor", "dr", "mr", "mrs", "ms", "shri", "smt", "sir", "madam", "maam", "mam"}
LIST_WORDS = {
    "list", "lists", "all", "every", "show", "give", "tell", "name", "names", "please", "complete", "full", "entire",
    "faculty", "faculties", "professor", "professors", "prof", "teacher", "teachers", "member", "members", "people",
    "of", "the", "in", "at", "on", "for", "to", "with", "and", "or", "a", "an", "from", "by", "who", "whom", "whose",
    "are", "is", "was", "were", "me", "my", "us", "do", "does", "can", "you", "i", "we", "how", "many", "what", "which",
    "there", "their", "any", "some", "has", "have", "having", "currently", "current", "present",
    "department", "departments", "dept", "depts", "nit", "nitr", "rourkela", "nitrkl", "institute", "working", "work",
    "works", "doing", "specializing", "specialising", "specialized", "specialised", "specialist", "specialists",
    "specialization", "specialisation", "specializes", "specialises", "specialize", "specialise", "expert", "experts",
    "expertise", "research", "researching", "researcher", "researchers", "area", "areas", "interest", "interests",
    "interested", "field", "fields", "domain", "domains", "about", "related", "based", "topic", "topics",
    "students", "student", "staff", "total", "number", "count", "strength", "details", "contact", "contacts", "email",
    "emails", "phone", "profile", "profiles", "designation", "designations", "information", "info",
}
FACULTY_RE = re.compile(r"\b(facult(?:y|ies)|professors?|teachers?)\b", re.I)
EXPERTISE_RE = re.compile(r"\b(speciali[sz]\w*|experts?|expertise|research(?:ing|ers?)?\s+(?:in|on|area)|work(?:s|ing)?\s+(?:in|on)|areas?\s+of|interested\s+in)\b", re.I)
HEAD_RE = re.compile(r"\b(hods?|heads?\s+of\s+(?:the\s+)?(?:\w+\s+){0,5}?(?:departments?|dept\b)|heads?\s+of\s+|department\s+heads?|\w+\s+heads?\b)", re.I)
HEADS_RE = re.compile(r"\b(hods|heads\s+of|all\s+heads?)\b", re.I)
NAME_STOP = TITLES | LIST_WORDS | {"head", "heads", "hod", "hods", "dean", "deans", "director", "registrar", "contact",
                                   "email", "phone", "number", "office", "room", "details", "profile", "information",
                                   "info", "know", "find", "where", "when", "why", "about", "publications", "his", "her"}
FUZZY = 0.75       # how close a misspelt part of a name must be
RARE_NAME = 6      # a single word may identify a person only if at most this many people share it


def _words(s: str) -> list[str]:
    return re.findall(r"[a-z]+", s.lower())


def _fold(w: str) -> str:
    """Spellings of one Indian name in English: Chowdhury, Choudhary, Chowdhry."""
    for a, b in (("ow", "ou"), ("dh", "d"), ("th", "t"), ("bh", "b"), ("ph", "f"), ("sh", "s"), ("ee", "i"), ("oo", "u"), ("aa", "a"), ("y", "i"), ("w", "v")):
        w = w.replace(a, b)
    return w


def _similar(a: str, b: str) -> float:
    if a == b:
        return 1.0
    if len(a) < 4 or len(b) < 4 or abs(len(a) - len(b)) > 3 or a[0] != b[0]:
        return 0.0
    return max(difflib.SequenceMatcher(None, a, b).ratio(), difflib.SequenceMatcher(None, _fold(a), _fold(b)).ratio())


class Directory:
    def __init__(self, con: sqlite3.Connection):
        try:
            self.people = [dict(r) for r in con.execute("SELECT * FROM people ORDER BY name")]
        except sqlite3.OperationalError:  # an older pack without the table: the chatbot works as before
            self.people = []
        self.frequency: dict[str, int] = {}
        for p in self.people:
            # initials are no evidence: "B.Tech" is not B.B.V.L. Deepak
            p["_words"] = [w for w in _words(p["name"]) if w not in TITLES and len(w) > 1]
            for w in set(p["_words"]):
                self.frequency[w] = self.frequency.get(w, 0) + 1
        self.dept_names: dict[str, str] = {}
        for p in self.people:
            if p["dept"] and p["dept_name"] and p["kind"] == "faculty":
                self.dept_names.setdefault(p["dept"], p["dept_name"])

    # ---- reading a question ----------------------------------------------------------------------

    def department(self, text: str) -> str | None:
        low = f" {text.lower()} "
        best, length = None, 0
        for code, name in self.dept_names.items():
            aliases = (name.lower(),) + DEPT_ALIASES.get(code, ())
            for a in aliases:
                if len(a) > length and re.search(rf"(?<![a-z]){re.escape(a)}(?![a-z])", low):
                    best, length = code, len(a)
        if best:
            return best
        for code in self.dept_names:  # bare codes count in capitals, next to a word about departments or faculty
            if re.search(rf"\b{code}\b", text) and (FACULTY_RE.search(text) or re.search(r"(?i)\b(dep|dept|department|hod|head)", text)):
                return code
        return None

    def _topic(self, text: str, dept: str | None) -> list[str]:
        low = text.lower()
        if dept:
            for a in sorted((self.dept_names.get(dept, "").lower(),) + DEPT_ALIASES.get(dept, ()) + (dept.lower(),), key=len, reverse=True):
                if a:
                    low = re.sub(rf"(?<![a-z]){re.escape(a)}(?![a-z])", " ", low)
        return [w for w in _words(low) if w not in LIST_WORDS]

    # ---- the four kinds of answer ----------------------------------------------------------------

    def find_names(self, text: str) -> tuple[list[dict], bool]:
        """People named in a question, allowing for spelling. Returns them, and whether a word had to be
        corrected or only part of the name was given."""
        asked = [w for w in dict.fromkeys(_words(text)) if w not in NAME_STOP and len(w) > 1]
        if not asked:
            return [], False
        strong, weak = [], []
        for p in self.people:
            scores = [max((_similar(w, q) for q in asked), default=0.0) for w in p["_words"]]
            exact = sum(s == 1.0 for s in scores)
            close = [s for s in scores if FUZZY <= s < 1.0]
            total = sum(max(s, 0) for s in scores if s >= FUZZY)
            if exact + len(close) >= 2 and (exact or sum(close) / len(close) >= 0.82):
                strong.append((total, exact, p))
            elif exact == 1 and not close:
                word = next(w for w, s in zip(p["_words"], scores) if s == 1.0)
                if len(word) >= 4 and self.frequency.get(word, 99) <= RARE_NAME:
                    weak.append((total, exact, p))
        found = strong or (weak if len(asked) <= 4 else [])
        found.sort(key=lambda x: (-x[0], x[2]["name"]))
        people = [p for _, _, p in found[:6]]
        unsure = bool(people) and not any(set(p["_words"]) <= set(asked) for p in people)
        return people, unsure

    def roster(self, dept: str) -> list[dict]:
        return [p for p in self.people if p["dept"] == dept and p["kind"] == "faculty"]

    def heads(self, dept: str | None = None) -> list[dict]:
        return [p for p in self.people if p["head_of"] and (not dept or p["head_of"] == dept)]

    def by_expertise(self, words: list[str], dept: str | None = None) -> list[tuple[dict, str]]:
        """Faculty whose stated interests (best), research group or biography mention the topic."""
        if not words:
            return []
        phrase = " ".join(words)

        def where(field: str) -> str:
            hay = " ".join(_words(field))
            if re.search(rf"\b{re.escape(phrase)}", hay):
                return field
            have = set(hay.split())
            stems = all(any(h.startswith(w[:max(4, len(w) - 1)]) for h in have) for w in words)
            return field if stems else ""

        ranked = []
        for p in self.people:
            if p["kind"] != "faculty" or (dept and p["dept"] != dept):
                continue
            for rank, field in enumerate(("interests", "research_group", "biography")):
                if p[field] and where(p[field]):
                    # the interest line that matched, not the whole list
                    parts = [x for x in p["interests"].split(";") if where(x)] if field == "interests" else []
                    why = "; ".join(x.strip() for x in parts) or f"mentioned in their {field.replace('_', ' ')}"
                    ranked.append((rank, p["dept"], p["name"], p, why))
                    break
        ranked.sort(key=lambda r: r[:3])
        return [(r[3], r[4]) for r in ranked]

    # ---- writing it out for the model --------------------------------------------------------------

    def _row(self, p: dict, extra: str = "") -> str:
        cells = [p["name"], p["designation"], p["email"]]
        if extra:
            cells.append(extra)
        return " | ".join(c for c in cells if c)

    def _block_people(self, people: list[dict], unsure: bool) -> dict:
        lines = []
        for p in people:
            where = p["dept_name"] or ""
            bits = [f"Name: {p['name']}", f"Designation: {p['designation']}" if p["designation"] else "",
                    f"Department or unit: {where}" if where else "", f"Email: {p['email']}" if p["email"] else "",
                    f"Phone: {p['phone']}" if p["phone"] else "", f"Room: {p['room']}" if p["room"] else "",
                    f"Research group: {p['research_group']}" if p["research_group"] else "",
                    f"Areas of interest: {p['interests']}" if p["interests"] else "",
                    f"Head of the {p['dept_name']} department" if p["head_of"] else "",
                    f"Profile: {p['profile_url']}" if p["profile_url"] else ""]
            lines.append("\n".join(b for b in bits if b))
        note = ("The spelling in the question differs from the directory, or only part of the name was given. "
                "Say which name you found, as 'I found ...', and answer about that person."
                if unsure else "")
        first = people[0]
        return {"title": f"Directory: {first['name']}" if len(people) == 1 else "Directory: people matching the name",
                "url": first["profile_url"] or first["listing_url"],
                "text": "\n\n".join(([note] if note else []) + lines)}

    def answer_for(self, *, name: str = "", department: str = "", expertise: str = "", role: str = "") -> dict | None:
        """The structured form, for the tool. Department may be a code or a name."""
        dept = self.department(department) or (department.upper() if department.upper() in self.dept_names else None)
        if name:
            found, unsure = self.find_names(name)
            return self._block_people(found, unsure) if found else None
        if role.lower() in ("head", "hod", "head of department"):
            return self._block_heads(dept)
        if expertise:
            return self._block_expertise(_words(expertise), dept, expertise)
        return self._block_roster(dept) if dept else self._block_counts()

    def _block_roster(self, dept: str) -> dict | None:
        rows = self.roster(dept)
        if not rows:
            return None
        name = self.dept_names.get(dept, dept)
        return {"title": f"Directory: faculty of {name}", "url": rows[0]["listing_url"],
                "text": f"The complete list: {len(rows)} faculty members of {name}. Say how many, then give every one of them.\n"
                        "Name | Designation | Email\n" + "\n".join(self._row(p) for p in rows)}

    def _block_heads(self, dept: str | None) -> dict | None:
        rows = self.heads(dept)
        if not rows:
            return None
        lines = [f"{self.dept_names.get(p['head_of'], p['dept_name'])}: {p['name']}, {p['designation']}"
                 + (f", {p['phone']}" if p["phone"] else "") + f", hod-{p['head_of'].lower()}@nitrkl.ac.in" for p in rows]
        return {"title": "Directory: Heads of Department", "url": f"{config.SITE_ROOT}/Institute/HOD/",
                "text": "The current Heads of Department, from the institute's Heads of Department page. "
                        "This overrides older names in any other source.\n" + "\n".join(lines)}

    def _block_expertise(self, words: list[str], dept: str | None, shown: str) -> dict | None:
        rows = self.by_expertise(words, dept)
        if not rows:
            return None
        cap = 45
        by_dept: dict[str, list[str]] = {}
        for p, why in rows[:cap]:
            by_dept.setdefault(p["dept_name"] or p["dept"], []).append(self._row(p, why))
        text = (f"The complete list: {len(rows)} faculty whose profiles mention \"{shown}\", by department. Give every one, "
                "and include all departments.\nName | Designation | Email | Matching interest\n"
                + "\n".join(f"{d}:\n" + "\n".join(r) for d, r in by_dept.items()))
        if len(rows) > cap:
            text += f"\n(The first {cap} of {len(rows)}. Say so, and suggest narrowing by department.)"
        return {"title": f"Directory: faculty working on {shown}", "url": f"{config.SITE_ROOT}/FacultyStaff/Faculty/", "text": text}

    def _block_counts(self) -> dict | None:
        if not self.dept_names:
            return None
        counts = [f"{name} ({code}): {len(self.roster(code))}" for code, name in sorted(self.dept_names.items(), key=lambda x: x[1])
                  if len(self.roster(code)) > 2]
        total = sum(p["kind"] == "faculty" for p in self.people)
        return {"title": "Directory: faculty by department", "url": f"{config.SITE_ROOT}/FacultyStaff/Faculty/",
                "text": f"{total} faculty members in all, too many to list here. Give these counts and ask which department "
                        "the reader wants.\n" + "\n".join(counts)}

    def lookup(self, question: str, previous: str = "") -> dict | None:
        """What the directory can say about a question, or None for questions that are not about people.
        A short follow-up ("and for ECE?") takes what it leaves out from the previous question."""
        if not self.people:
            return None
        dept = self.department(question)
        follow = len(question.split()) < 8 and previous
        context = f"{previous} {question}" if follow else question
        wants_head = HEAD_RE.search(context) and (dept or self.department(context) or HEADS_RE.search(context))
        wants_faculty = FACULTY_RE.search(context)
        wants_topic = EXPERTISE_RE.search(context)
        if follow and not dept and not self.department(previous):
            wants_head = wants_head if HEAD_RE.search(question) else None
        dept = dept or (self.department(previous) if follow else None)
        if wants_head:
            found = self._block_heads(dept)
            if found:
                return {**found, "names": [], "focused": True}
        if wants_topic or wants_faculty:
            topic = self._topic(question, dept)
            if not topic and follow:
                topic = self._topic(previous, self.department(previous))
            if topic:
                found = self._block_expertise(topic, dept, " ".join(topic))
                if found:
                    return {**found, "names": [], "focused": True}
            elif wants_faculty:
                found = self._block_roster(dept) if dept else self._block_counts()
                if found:
                    return {**found, "names": [], "focused": True}
        found, unsure = self.find_names(question)
        if found:
            # staff have no publications or pages of their own for a search to add
            focused = all(p["kind"] == "staff" for p in found)
            return {**self._block_people(found, unsure), "names": [p["name"] for p in found[:2]], "focused": focused}
        return None


def check() -> int:
    """The questions that went wrong in a demonstration, and the like. Prints failures; returns their number."""
    import os
    from .packfiles import pack_dir

    pack = pack_dir()
    path = pack / "serve.sqlite" if pack else config.DB_PATH
    con = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    d = Directory(con)
    cases = [
        ("list all faculties of CSE department", ["Anup Nandy", "Pankaj Kumar Sa", "Tapas Kumar Mishra", "Sumanta Pyne"], []),
        ("list of faculties specializing in image processing", ["Pankaj Kumar Sa"], []),
        ("who is the head of CSE Department", ["Pankaj Kumar Sa"], ["Turuk"]),
        ("Who is the HOD of CS?", ["Pankaj Kumar Sa"], ["Turuk"]),
        ("Chiranjib Choudhary", ["Chiranjib Chowdhury"], []),
        ("Chiranjib Chowdhry", ["Chiranjib Chowdhury"], []),
        ("who is prof turuk", ["Ashok Kumar Turuk"], []),
        ("how many faculty are in electrical engineering", ["Electrical"], []),
        ("heads of all departments", ["Pankaj Kumar Sa", "Kishanjit Kumar Khatua"], []),
    ]
    none = ["What is the B.Tech fee structure?", "What was the highest package in 2025-26?", "When is the convocation?",
            "How do I apply for M.Tech?", "Who is the director of NIT Rourkela?", "List of tenders", "hostel fee",
            "What is the NIRF rank of NIT Rourkela?", "Upcoming conferences", "academic calendar"]
    failed = 0
    for q, want, reject in cases:
        got = d.lookup(q)
        text = got["text"] if got else ""
        bad = [w for w in want if w not in text] + [f"not {w}" for w in reject if w in text]
        failed += bool(bad)
        print(("FAIL " if bad else "ok   ") + q + (f"  {bad}" if bad else ""))
    for q in none:
        got = d.lookup(q)
        failed += bool(got)
        print(("FAIL " if got else "ok   ") + q + (f"  unexpected: {got['title']}" if got else ""))
    print(f"{len(d.people)} people; {failed} failed")
    return failed


if __name__ == "__main__":
    if "--check" in sys.argv:
        raise SystemExit(check())
    build(sys.argv[1] if len(sys.argv) > 1 else None)
