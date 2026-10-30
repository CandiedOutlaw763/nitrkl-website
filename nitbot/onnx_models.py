"""The two ONNX models behind retrieval, run with onnxruntime and tokenizers alone.

fastembed does the same thing locally, but it brings a dozen dependencies that would not fit in a
serverless function. These classes reproduce its preprocessing (truncation to 512 tokens, padding
to the longest input, CLS pooling with L2 normalisation for embeddings, logit 0 for the reranker),
so query vectors match the stored document vectors that fastembed computed.
"""
import json
from pathlib import Path

import numpy as np

MAX_TOKENS = 512


def _tokenizer(model_dir: Path):
    from tokenizers import Tokenizer

    tok = Tokenizer.from_file(str(model_dir / "tokenizer.json"))
    cfg = json.loads((model_dir / "tokenizer_config.json").read_text(encoding="utf-8"))
    limit = min(int(cfg.get("model_max_length") or MAX_TOKENS), MAX_TOKENS)
    tok.enable_truncation(max_length=limit)
    pad = (tok.padding or {}).get("pad_token") or cfg.get("pad_token") or "[PAD]"
    tok.enable_padding(pad_id=tok.token_to_id(pad) or 0, pad_token=pad)
    return tok


def _session(path: Path):
    import onnxruntime as ort

    opts = ort.SessionOptions()
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    return ort.InferenceSession(str(path), sess_options=opts, providers=["CPUExecutionProvider"])


class _Model:
    def __init__(self, model_dir: Path, model_file: str):
        self.tok = _tokenizer(model_dir)
        self.session = _session(model_dir / model_file)
        self.inputs = {i.name for i in self.session.get_inputs()}

    def _run(self, encodings) -> np.ndarray:
        feed = {
            "input_ids": np.array([e.ids for e in encodings], dtype=np.int64),
            "attention_mask": np.array([e.attention_mask for e in encodings], dtype=np.int64),
        }
        if "token_type_ids" in self.inputs:
            feed["token_type_ids"] = np.array([e.type_ids for e in encodings], dtype=np.int64)
        return self.session.run(None, {k: v for k, v in feed.items() if k in self.inputs})[0]


class Embedder(_Model):
    def embed(self, texts: list[str]) -> np.ndarray:
        out = self._run(self.tok.encode_batch(texts))
        vecs = out[:, 0] if out.ndim == 3 else out
        return vecs / np.maximum(np.linalg.norm(vecs, axis=1, keepdims=True), 1e-12)


class Reranker(_Model):
    def rerank(self, query: str, passages: list[str], batch: int = 32) -> list[float]:
        scores: list[float] = []
        for i in range(0, len(passages), batch):
            out = self._run(self.tok.encode_batch([(query, p) for p in passages[i:i + batch]]))
            scores.extend(float(x) for x in out[:, 0])
        return scores
