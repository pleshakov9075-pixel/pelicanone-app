import time
from typing import Any

import httpx

from app.core.settings import get_settings
from app.providers.genapi.errors import GenApiRetryableError

settings = get_settings()


class GenApiClient:
    def __init__(self) -> None:
        self._client = httpx.Client(
            base_url=settings.genapi_base_url,
            headers={"Authorization": f"Bearer {settings.genapi_api_key}"},
            timeout=httpx.Timeout(30.0),
        )

    def submit_network(self, network_id: str, params: dict, files: dict | None = None) -> dict:
        return self._post(f"/networks/{network_id}", params, files)

    def submit_function(
        self, function_id: str, implementation: str, params: dict, files: dict | None = None
    ) -> dict:
        payload = {"implementation": implementation, "params": params}
        return self._post(f"/functions/{function_id}", payload, files)

    def poll(self, request_id: str) -> dict:
        response = self._client.get(f"/request/get/{request_id}")
        if response.status_code in {429, 500, 502, 503}:
            raise GenApiRetryableError("retryable_status")
        response.raise_for_status()
        return response.json()

    def _post(self, path: str, payload: dict, files: dict | None = None) -> dict:
        try:
            response = self._client.post(path, json=payload, files=files)
        except httpx.HTTPError as exc:
            raise GenApiRetryableError("network_error") from exc
        if response.status_code in {429, 500, 502, 503}:
            raise GenApiRetryableError("retryable_status")
        response.raise_for_status()
        return response.json()

    def poll_until_done(self, request_id: str, timeout_s: int = 120, interval_s: float = 2.0) -> dict:
        started = time.time()
        while True:
            if time.time() - started > timeout_s:
                raise TimeoutError("genapi_timeout")
            data = self.poll(request_id)
            status = data.get("status")
            if status in {"done", "error"}:
                return data
            time.sleep(interval_s)
