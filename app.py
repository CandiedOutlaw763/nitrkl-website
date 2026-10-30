"""Vercel entrypoint: the chatbot API (chatbot/nitbot/server.py) as one FastAPI function.
Vercel serves public/ (the site) from its CDN; /api/... reaches this app. On a cold start the
app downloads the serving pack from NITBOT_PACK_URL (see deploy/README.md)."""
from nitbot.server import app  # noqa: F401
