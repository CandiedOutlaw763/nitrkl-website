"""Locating (and, on a serverless host, fetching) the serving pack built by nitbot.pack."""
import tarfile
import threading
import urllib.request
from pathlib import Path

from . import config

_lock = threading.Lock()
READY = "serve.sqlite"


def pack_dir() -> Path | None:
    """The pack directory if a pack is available, downloading it first when NITBOT_PACK_URL is set."""
    d = config.PACK_DIR
    if d is None:
        return None
    if (d / READY).exists():
        return d
    if not config.PACK_URL:
        return None
    with _lock:
        if not (d / READY).exists():
            _download(config.PACK_URL, d)
    return d


def _download(url: str, dest: Path) -> None:
    """Unpack the archive while it streams in: a serverless /tmp cannot hold the archive and its contents."""
    dest.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": config.USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as r, tarfile.open(fileobj=r, mode="r|gz") as tar:
        tar.extractall(dest, filter="data")  # serve.sqlite comes last, so READY marks a complete pack
