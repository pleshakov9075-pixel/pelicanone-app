import asyncio
import datetime as dt
import logging
import time
from pathlib import Path

import httpx
from sqlalchemy import select

from app.core.models.job import Job
from app.core.models.upload import Upload
from app.core.job_files import persist_result_files
from app.core.presets import get_preset_polling_settings
from app.core.repositories.credits import CreditRepository
from app.core.settings import get_settings
from app.db import async_session
from app.providers.genapi.client import GenApiClient
from app.providers.genapi.errors import GenApiRetryableError
from app.providers.genapi.extractor import normalize_result

RETRY_DELAYS = [1, 3, 5]
DEFAULT_POLL_INTERVAL_S = 2.0
DEFAULT_TIMEOUTS = {
    "text": 120,
    "image": 600,
    "edit": 600,
    "audio": 1200,
    "video": 1800,
    "upscale": 900,
}

logger = logging.getLogger(__name__)


def run_job(job_id: str) -> dict:
    return asyncio.run(_run_job_async(job_id))


async def _run_job_async(job_id: str) -> dict:
    async with async_session() as session:
        job = await session.get(Job, job_id)
        if not job or job.status in {"done", "error"}:
            return _build_empty_result(job.type if job else "text")
        job.status = "processing"
        job.started_at = dt.datetime.utcnow()
        await session.commit()

        client = GenApiClient()
        result_payload: dict | None = None
        error: Exception | None = None
        try:
            result = await _execute_with_retry(client, job.type, job.payload)
            job.status = "done"
            result_payload = normalize_result(result, job.type)
            result_payload, result_files = await persist_result_files(str(job.id), result_payload)
            job.result = result_payload
            job.result_files = result_files
            job.error = None
        except Exception as exc:  # pragma: no cover - fallback for unknown errors
            logger.exception("Job %s failed", job_id, exc_info=exc)
            job.status = "error"
            job.error = _human_error_message(exc)
            result_payload = None
            job.result = None
            job.result_files = None
            error = exc
        finally:
            if job.status in {"done", "error"}:
                job.finished_at = dt.datetime.utcnow()
            await session.commit()
            if job.status == "error" and job.cost:
                credits = CreditRepository(session)
                refunded = await credits.has_job_reason(job.id, "job_refund")
                if not refunded:
                    await credits.create_tx(
                        job.user_id, delta=job.cost, reason="job_refund", job_id=job.id
                    )
                    await session.commit()
        if error:
            raise error
        return result_payload or _build_empty_result(job.type)


async def _execute_with_retry(client: GenApiClient, job_type: str, payload: dict):
    last_error = None
    for delay in [0, *RETRY_DELAYS]:
        if delay:
            time.sleep(delay)
        try:
            request = _submit_request(client, job_type, payload)
            request_id = request.get("request_id") or request.get("id")
            if not request_id:
                raise ValueError("missing_request_id")
            timeout_s, interval_s = _resolve_polling_settings(job_type, payload)
            logger.info(
                "GenAPI poll start request_id=%s timeout_s=%s interval_s=%s",
                request_id,
                timeout_s,
                interval_s,
            )
            response = client.poll_until_done(request_id, timeout_s=timeout_s, interval_s=interval_s)
            if response.get("status") == "error":
                raise ValueError(response.get("error", "genapi_error"))
            return response
        except httpx.HTTPStatusError as exc:
            response = exc.response
            logger.error(
                "GenAPI request failed status_code=%s response=%s",
                getattr(response, "status_code", None),
                getattr(response, "text", None),
            )
            raise
        except GenApiRetryableError as exc:
            last_error = exc
            if str(exc) == "genapi_timeout":
                break
            continue
    raise last_error or RuntimeError("genapi_failed")


def _submit_request(client: GenApiClient, job_type: str, payload: dict):
    if "network_id" in payload:
        network_id = payload["network_id"]
        if job_type == "text":
            settings = get_settings()
            network_id = settings.text_model
        params = _prepare_network_params(job_type, payload)
        return client.submit_network(network_id, params)
    return client.submit_function(
        payload.get("function_id", ""),
        payload.get("implementation", ""),
        payload.get("params", {}),
    )


def _prepare_network_params(job_type: str, payload: dict) -> dict:
    params = payload.get("params") or {}
    if (
        job_type == "text"
        and "messages" not in params
        and "prompt" in params
    ):
        mapped_params = {
            "messages": [{"role": "user", "content": params["prompt"]}],
        }
        for key in ("temperature", "max_tokens", "translate_input"):
            if key in params:
                mapped_params[key] = params[key]
        return mapped_params
    return params


def _resolve_polling_settings(job_type: str, payload: dict) -> tuple[int, float]:
    preset_timeout, preset_interval = get_preset_polling_settings(payload)
    if preset_timeout is not None:
        timeout_s = preset_timeout
    else:
        timeout_s = _fallback_timeout(job_type, payload)
    interval_s = preset_interval or DEFAULT_POLL_INTERVAL_S
    return timeout_s, interval_s


def _fallback_timeout(job_type: str, payload: dict) -> int:
    if job_type == "upscale":
        network_id = payload.get("network_id") if isinstance(payload, dict) else None
        if network_id == "seedvr-video":
            return 1800
        return 900
    return DEFAULT_TIMEOUTS.get(job_type, 120)


def cleanup_storage() -> dict[str, int]:
    return asyncio.run(_cleanup_storage_async())


def cleanup_job_files() -> dict[str, int]:
    return cleanup_storage()


async def _cleanup_storage_async() -> dict[str, int]:
    settings = get_settings()
    storage_root = Path(settings.files_storage_path)
    storage_root.mkdir(parents=True, exist_ok=True)
    now = dt.datetime.utcnow()
    removed_uploads = 0
    removed_job_files = 0
    freed_bytes = 0
    logger.info("cleanup: start")

    async with async_session() as session:
        expired_uploads = (
            await session.execute(select(Upload).where(Upload.expires_at < now))
        ).scalars().all()
        for upload in expired_uploads:
            removed_uploads += 1
            removed, removed_size = _remove_file(
                _resolve_storage_path(storage_root, upload.path),
                storage_root,
            )
            if removed:
                freed_bytes += removed_size
            await session.delete(upload)

        cutoff = now - dt.timedelta(days=settings.job_results_ttl_days)
        expired_jobs = (
            await session.execute(
                select(Job).where(
                    Job.status == "done",
                    Job.updated_at < cutoff,
                )
            )
        ).scalars().all()
        for job in expired_jobs:
            removed, removed_size = _remove_job_files(storage_root, job.result_files or [])
            removed_job_files += removed
            freed_bytes += removed_size
            if job.result_files is not None:
                job.result_files = None

        await session.commit()

    freed_mb = round(freed_bytes / (1024 * 1024), 2)
    logger.info(
        "cleanup: removed_uploads=%s removed_job_files=%s freed_mb=%s",
        removed_uploads,
        removed_job_files,
        freed_mb,
    )
    return {
        "removed_uploads": removed_uploads,
        "removed_job_files": removed_job_files,
        "freed_bytes": freed_bytes,
    }


def _resolve_storage_path(storage_root: Path, path_value: str | None) -> Path | None:
    if not path_value:
        return None
    path = Path(path_value)
    if not path.is_absolute():
        path = storage_root / path
    try:
        resolved = path.resolve()
    except FileNotFoundError:
        resolved = path
    if storage_root not in resolved.parents and resolved != storage_root:
        logger.warning("cleanup: skip path outside storage: %s", resolved)
        return None
    return resolved


def _remove_file(path: Path | None, storage_root: Path) -> tuple[int, int]:
    if not path:
        return 0, 0
    try:
        if not path.exists() or not path.is_file():
            return 0, 0
        size = path.stat().st_size
        path.unlink()
        _cleanup_empty_parents(path.parent, storage_root)
        return 1, size
    except FileNotFoundError:
        return 0, 0
    except Exception as exc:  # pragma: no cover - best-effort cleanup
        logger.warning("cleanup: failed to remove %s: %s", path, exc)
        return 0, 0


def _cleanup_empty_parents(path: Path, stop_at: Path) -> None:
    current = path
    while current != stop_at and stop_at in current.parents:
        try:
            current.rmdir()
        except OSError:
            break
        current = current.parent


def _remove_job_files(storage_root: Path, result_files: list[dict]) -> tuple[int, int]:
    removed = 0
    removed_bytes = 0
    for item in result_files:
        if not isinstance(item, dict):
            continue
        path_value = item.get("path") or item.get("filename")
        file_path = _resolve_storage_path(storage_root, str(path_value) if path_value else None)
        file_removed, removed_size = _remove_file(file_path, storage_root)
        removed += file_removed
        removed_bytes += removed_size
    return removed, removed_bytes


def _build_empty_result(job_type: str) -> dict:
    normalized_type = _normalize_result_type(job_type)
    return {
        "type": normalized_type,
        "items": [{"kind": "text", "text": "", "content_type": "text/plain"}],
        "raw": {},
    }


def _build_error_result(job_type: str, message: str) -> dict:
    normalized_type = _normalize_result_type(job_type)
    return {
        "type": normalized_type,
        "items": [{"kind": "text", "text": "", "content_type": "text/plain"}],
        "raw": {"error": message},
    }


def _normalize_result_type(job_type: str) -> str:
    mapped = {"upscale": "image", "edit": "image"}.get(job_type, job_type)
    if mapped not in {"text", "image", "video", "audio"}:
        return "text"
    return mapped


def _human_error_message(exc: Exception) -> str:
    message = str(exc) if exc else ""
    if not message:
        return "Generation failed."
    if message == "genapi_timeout":
        return "Generation timed out."
    if message == "genapi_failed":
        return "Generation failed. Please try again."
    if message == "missing_request_id":
        return "Generation failed. Missing request id."
    return message
