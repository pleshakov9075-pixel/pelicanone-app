import asyncio
import logging
import mimetypes
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.settings import get_settings

logger = logging.getLogger(__name__)

DEFAULT_DOWNLOAD_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
RETRY_DELAYS = [0, 2, 5]


def storage_root() -> Path:
    settings = get_settings()
    root = Path(settings.files_storage_path)
    root.mkdir(parents=True, exist_ok=True)
    return root


def ensure_job_dir(job_id: str) -> Path:
    root = storage_root()
    job_dir = root / "jobs" / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    return job_dir


def build_file_url(job_id: str, filename: str) -> str:
    settings = get_settings()
    return f"{settings.api_prefix}/files/{job_id}/{filename}"


def resolve_job_file_path(job_id: str, filename: str) -> Path:
    job_dir = ensure_job_dir(job_id)
    return job_dir / filename


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


def _is_local_file_url(url: str) -> bool:
    settings = get_settings()
    parsed = urlparse(url)
    path = parsed.path or url
    return path.startswith(f"{settings.api_prefix}/files/")


async def _download_file(client: httpx.AsyncClient, source_url: str, job_dir: Path) -> dict[str, str]:
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
            file_path = job_dir / filename
            file_path.write_bytes(response.content)
            return {
                "filename": filename,
                "content_type": content_type.split(";")[0].strip(),
            }
        except Exception as exc:
            last_exc = exc
            logger.warning("Failed to download %s: %s", source_url, exc)
    raise last_exc or RuntimeError("download_failed")


async def persist_result_files(
    job_id: str, result: dict[str, Any]
) -> tuple[dict[str, Any], list[dict[str, Any]] | None]:
    items = result.get("items") or []
    file_items = [
        item for item in items if isinstance(item, dict) and item.get("kind") == "file" and item.get("url")
    ]
    if not file_items:
        return result, None

    job_dir = ensure_job_dir(job_id)
    stored_files: list[dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=DEFAULT_DOWNLOAD_TIMEOUT) as client:
        for item in file_items:
            source_url = str(item.get("url"))
            if _is_local_file_url(source_url):
                filename = item.get("filename") or Path(urlparse(source_url).path).name
                if filename:
                    item["filename"] = filename
                continue
            stored = await _download_file(client, source_url, job_dir)
            item.update(stored)
            item["url"] = build_file_url(job_id, stored["filename"])

    settings = get_settings()
    root = Path(settings.files_storage_path)
    file_type = result.get("type") or "file"
    for item in file_items:
        filename = item.get("filename")
        if not filename:
            continue
        file_path = resolve_job_file_path(job_id, filename)
        try:
            relative_path = file_path.relative_to(root)
        except ValueError:
            relative_path = file_path
        stored_files.append(
            {
                "type": file_type,
                "path": str(relative_path),
                "url": item.get("url"),
                "filename": filename,
            }
        )

    return result, stored_files or None
