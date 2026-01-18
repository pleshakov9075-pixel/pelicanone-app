import asyncio
import time

from app.core.models.job import Job
from app.db import async_session
from app.providers.genapi.client import GenApiClient
from app.providers.genapi.errors import GenApiRetryableError
from app.providers.genapi.extractor import normalize_result

RETRY_DELAYS = [1, 3, 5]


def run_job(job_id: str) -> None:
    asyncio.run(_run_job_async(job_id))


async def _run_job_async(job_id: str) -> None:
    async with async_session() as session:
        job = await session.get(Job, job_id)
        if not job or job.status in {"canceled", "succeeded", "failed"}:
            return
        job.status = "running"
        await session.commit()

        client = GenApiClient()
        try:
            result = await _execute_with_retry(client, job.payload)
            job.status = "succeeded"
            job.result = normalize_result(result)
        except Exception as exc:  # pragma: no cover - fallback for unknown errors
            job.status = "failed"
            job.result = {"error": str(exc)}
        finally:
            await session.commit()


async def _execute_with_retry(client: GenApiClient, payload: dict):
    last_error = None
    for delay in [0, *RETRY_DELAYS]:
        if delay:
            time.sleep(delay)
        try:
            request = _submit_request(client, payload)
            request_id = request.get("request_id") or request.get("id")
            if not request_id:
                raise ValueError("missing_request_id")
            response = client.poll_until_done(request_id)
            if response.get("status") == "error":
                raise ValueError(response.get("error", "genapi_error"))
            return response
        except GenApiRetryableError as exc:
            last_error = exc
            continue
    raise last_error or RuntimeError("genapi_failed")


def _submit_request(client: GenApiClient, payload: dict):
    if "network_id" in payload:
        return client.submit_network(payload["network_id"], payload.get("params", {}))
    return client.submit_function(
        payload.get("function_id", ""),
        payload.get("implementation", ""),
        payload.get("params", {}),
    )
