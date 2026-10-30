"""HTTP API for the chatbot.

    POST /api/chat     {"messages": [{"role": "user", "content": "..."}, ...]}  -> text/event-stream
    POST /api/search   {"query": "...", "k": 6}                                -> retrieval results (debugging)
    GET  /api/health
    GET  /demo/        minimal test page

Run:  uvicorn nitbot.server:app --port 8000
"""
import json
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import config
from .chat import Chat

RATE_LIMIT = 20       # chat requests per client IP ...
RATE_WINDOW = 60.0    # ... per this many seconds


@asynccontextmanager
async def lifespan(_app):
    try:
        chat()  # load the models (and on a serverless host, fetch the pack) before the first question
    except Exception as e:  # e.g. no GROQ_API_KEY yet: keep serving /api/health, which reports it
        print(f"chat not ready: {e!r}")
    yield


# API docs live under /api/: the site itself owns /docs/ (its uploaded files)
app = FastAPI(title="NIT Rourkela chatbot", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None, swagger_ui_oauth2_redirect_url=None)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])
if (config.ROOT / "web").is_dir():  # the test page; not part of the deployed site
    app.mount("/demo", StaticFiles(directory=config.ROOT / "web", html=True), name="demo")
    if not config.SITE_DIR:  # with the site mounted, / is the homepage
        app.add_api_route("/", lambda: RedirectResponse("/demo/"), include_in_schema=False)

_chat: Chat | None = None
_hits: dict[str, deque] = defaultdict(deque)


def chat() -> Chat:
    global _chat
    if _chat is None:
        _chat = Chat()
    return _chat


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=8000)


class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=50)


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    k: int = Field(default=6, ge=1, le=20)


def _rate_limited(ip: str) -> bool:
    now, q = time.monotonic(), _hits[ip]
    while q and now - q[0] > RATE_WINDOW:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        return True
    q.append(now)
    return False




@app.get("/api/health")
def health():
    import sqlite3
    fts5 = "ENABLE_FTS5" in {r[0] for r in sqlite3.connect(":memory:").execute("PRAGMA compile_options")}
    return {"ok": bool(config.GROQ_API_KEY) and fts5, "model": config.GROQ_MODEL, "key": bool(config.GROQ_API_KEY),
            "fts5": fts5, "pack": bool(config.PACK_DIR), "loaded": _chat is not None}


@app.post("/api/search")
def search(req: SearchRequest):
    return chat().retriever.search(req.query, k=req.k)


@app.post("/api/chat")
def chat_endpoint(req: ChatRequest, request: Request):
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0].strip()
    if _rate_limited(ip):
        raise HTTPException(429, "Too many requests. Please wait a minute.")

    def events():
        try:
            for event in chat().answer([m.model_dump() for m in req.messages]):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:  # never leave the client hanging mid-stream
            yield f"data: {json.dumps({'type': 'error', 'message': f'Internal error ({type(e).__name__}).'})}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# Local use: NITBOT_SITE_DIR serves the homepage from this server too, so the page and its chat
# widget share one address (the "Start NIT Rourkela" launcher sets it). Mounted last, after /api.
if config.SITE_DIR:
    app.mount("/", StaticFiles(directory=config.SITE_DIR, html=True), name="site")
