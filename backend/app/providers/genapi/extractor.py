from typing import Any


def normalize_result(payload: dict[str, Any]) -> dict[str, Any]:
    result = {
        "text": payload.get("text"),
        "files": payload.get("files", []),
        "metadata": payload.get("metadata", {}),
        "raw": payload,
    }
    return result
