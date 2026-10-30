"""Paths and settings. Everything is overridable through environment variables (or a .env file)."""
import os
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(ROOT / ".env")

# Kept outside OneDrive by default: a SQLite file that is being written while
# OneDrive syncs it can get corrupted, and the raw crawl is several hundred MB.
DATA_DIR = Path(os.environ.get("NITBOT_DATA_DIR", Path.home() / "nitbot-data"))
try:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
except OSError:  # read-only home on a serverless host; only the pack directory is written there
    pass
DB_PATH = DATA_DIR / "nitbot.sqlite"
EMB_PATH = DATA_DIR / "embeddings.npy"
MODEL_DIR = DATA_DIR / "models"  # fastembed's default cache is in %TEMP%, which Windows may clean

# Serving pack (python -m nitbot.pack): the slim database, int8 vectors and the two ONNX models.
# The API uses it when NITBOT_PACK_DIR holds one, or downloads NITBOT_PACK_URL (a .tar.gz) there
# on first use, which is how it runs on a serverless host. Without either it uses the full index.
PACK_URL = os.environ.get("NITBOT_PACK_URL", "")
_pack = os.environ.get("NITBOT_PACK_DIR") or (str(Path(tempfile.gettempdir()) / "nitbot-pack") if PACK_URL else "")
PACK_DIR = Path(_pack) if _pack else None

SITE_HOSTS = {"www.nitrkl.ac.in", "nitrkl.ac.in"}
SITE_ROOT = "https://www.nitrkl.ac.in"
SEED_URLS = [f"{SITE_ROOT}/", f"{SITE_ROOT}/Home/SiteMap"]

CRAWL_CONCURRENCY = int(os.environ.get("NITBOT_CRAWL_CONCURRENCY", "4"))
CRAWL_DELAY = float(os.environ.get("NITBOT_CRAWL_DELAY", "0.25"))  # seconds between requests per worker
CRAWL_MAX_PAGES = int(os.environ.get("NITBOT_CRAWL_MAX_PAGES", "30000"))
CRAWL_MAX_DEPTH = int(os.environ.get("NITBOT_CRAWL_MAX_DEPTH", "10"))
CRAWL_MAX_FILE_MB = float(os.environ.get("NITBOT_CRAWL_MAX_FILE_MB", "40"))
USER_AGENT = "NITRKL-Chatbot-Indexer/0.1 (CAT, NIT Rourkela)"

EMBED_MODEL = os.environ.get("NITBOT_EMBED_MODEL", "BAAI/bge-small-en-v1.5")
EMBED_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
RERANK_MODEL = os.environ.get("NITBOT_RERANK_MODEL", "Xenova/ms-marco-MiniLM-L-6-v2")
RERANK = os.environ.get("NITBOT_RERANK", "1") != "0"  # 0 = skip the cross-encoder (faster, a bit less precise)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
# Groq's free tier rejects any single request above the model's tokens-per-minute limit (8,000 for
# gpt-oss-120b, counting the 2,048 reserved for the answer). Prompts are kept under this many tokens.
GROQ_MAX_INPUT_TOKENS = int(os.environ.get("GROQ_MAX_INPUT_TOKENS", "5500"))

SITE_DIR = os.environ.get("NITBOT_SITE_DIR", "")  # optional: serve the website from this server too

CORS_ORIGINS = [o.strip() for o in os.environ.get("NITBOT_CORS_ORIGINS", "*").split(",") if o.strip()]
