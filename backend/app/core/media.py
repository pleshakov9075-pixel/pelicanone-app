import logging
import mimetypes
import asyncio
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.settings import get_settings

logger = logging.getLogger(__name__)

DEFAULT_DOWNLOAD_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
RETRY_DELAYS = [0, 2, 5]


def ensure_media_dir() -> Path:
    settings = get_settings()
    media_dir = Path(settings.media_dir)
    media_dir.mkdir(parents=True, exist_ok=True)
    return media_dir


def _build_public_url(filename: str) -> str:
    settings = get_settings()
    base = settings.media_base_url.rstrip("/")
    return f"{base}/{filename}"


def _guess_extension(content_type: str | None, source_url: str) -> str:
    if content_type:
        extension = mimetypes.guess_extension(content_type.split(";")[0].strip())
        if extension:
            return extension
    parsed = urlparse(source_url)
    suffix = Path(parsed.path).suffix
    if suffix:
        return suffix
    return ".bin"


async def download_to_media(client: httpx.AsyncClient, source_url: str) -> dict[str, str]:
    last_exc: Exception | None = None
    for delay in RETRY_DELAYS:
        if delay:
            await asyncio.sleep(delay)
        try:
            response = await client.get(source_url)
            response.raise_for_status()
            content_type = response.headers.get("Content-Type", "application/octet-stream")
            extension = _guess_extension(content_type, source_url)
            filename = f"{uuid.uuid4().hex}{extension}"
            media_dir = ensure_media_dir()
            file_path = media_dir / filename
            file_path.write_bytes(response.content)
            return {
                "url": _build_public_url(filename),
                "filename": filename,
                "content_type": content_type.split(";")[0].strip(),
            }
        except Exception as exc:
            last_exc = exc
            logger.warning("Failed to download %s: %s", source_url, exc)
    raise last_exc or RuntimeError("download_failed")


async def persist_result_files(result: dict[str, Any]) -> dict[str, Any]:
    items = result.get("items") or []
    file_items = [
        item for item in items if isinstance(item, dict) and item.get("kind") == "file" and item.get("url")
    ]
    if not file_items:
        return result

    async with httpx.AsyncClient(timeout=DEFAULT_DOWNLOAD_TIMEOUT) as client:
        for item in file_items:
            source_url = str(item.get("url"))
            if _is_local_media(source_url):
                continue
            stored = await download_to_media(client, source_url)
            item.update(stored)
    return result


def _is_local_media(url: str) -> bool:
    settings = get_settings()
    base = settings.media_base_url.rstrip("/")
    if base.startswith("http"):
        return url.startswith(base)
    return urlparse(url).path.startswith(base)


def cleanup_media_files() -> dict[str, int]:
    settings = get_settings()
    media_dir = Path(settings.media_dir)
    if not media_dir.exists():
        return {"removed": 0}
    now = time.time()
    removed = 0
    for path in media_dir.iterdir():
        if not path.is_file():
            continue
        age = now - path.stat().st_mtime
        if age > settings.media_ttl_seconds:
            try:
                path.unlink()
                removed += 1
            except FileNotFoundError:
                continue
    return {"removed": removed}
