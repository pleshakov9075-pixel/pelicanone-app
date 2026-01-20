import asyncio
import datetime as dt
import logging
import time

import httpx

from app.core.models.job import Job
from app.core.presets import get_preset_polling_settings
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


def run_job(job_id: str) -> dict | None:
    return asyncio.run(_run_job_async(job_id))


async def _run_job_async(job_id: str) -> dict | None:
    async with async_session() as session:
        job = await session.get(Job, job_id)
        if not job or job.status in {"canceled", "succeeded", "failed"}:
            return
        job.status = "running"
        job.started_at = dt.datetime.utcnow()
        await session.commit()

        client = GenApiClient()
        result_payload = None
        error: Exception | None = None
        try:
            result = await _execute_with_retry(client, job.type, job.payload)
            job.status = "succeeded"
            result_payload = normalize_result(result)
            job.result = result_payload
        except Exception as exc:  # pragma: no cover - fallback for unknown errors
            job.status = "failed"
            job.result = {"error": str(exc)}
            error = exc
        finally:
            if job.status in {"succeeded", "failed", "canceled"}:
                job.finished_at = dt.datetime.utcnow()
            await session.commit()
        if error:
            raise error
        return result_payload


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
        params = _prepare_network_params(job_type, payload)
        return client.submit_network(payload["network_id"], params)
    return client.submit_function(
        payload.get("function_id", ""),
        payload.get("implementation", ""),
        payload.get("params", {}),
    )


def _prepare_network_params(job_type: str, payload: dict) -> dict:
    params = payload.get("params") or {}
    if (
        job_type == "text"
        and payload.get("network_id") == "grok-4-1"
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
