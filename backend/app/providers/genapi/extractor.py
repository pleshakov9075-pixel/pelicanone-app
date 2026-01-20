from typing import Any
from urllib.parse import urlparse


def normalize_result(payload: dict[str, Any], job_type: str) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    text_value = payload.get("text") or payload.get("result") or payload.get("output")
    if isinstance(text_value, str) and text_value.strip():
        items.append({"kind": "text", "text": text_value, "content_type": "text/plain"})

    files = payload.get("files") or payload.get("file_urls") or []
    if isinstance(files, dict):
        files = [files]
    if isinstance(files, list):
        for file_item in files:
            url = None
            content_type = None
            if isinstance(file_item, str):
                url = file_item
            elif isinstance(file_item, dict):
                url = file_item.get("url") or file_item.get("file") or file_item.get("href")
                content_type = file_item.get("content_type") or file_item.get("mime")
            if not url:
                continue
            filename = urlparse(url).path.split("/")[-1]
            items.append(
                {
                    "kind": "file",
                    "url": url,
                    "filename": filename,
                    "content_type": content_type,
                }
            )

    type_map = {"upscale": "image", "edit": "image"}
    result_type = type_map.get(job_type, job_type)
    if result_type not in {"image", "video", "audio", "text"}:
        result_type = "text"
    if result_type == "text" and not items:
        items.append({"kind": "text", "text": "", "content_type": "text/plain"})

    return {
        "type": result_type,
        "items": items,
        "raw": payload,
    }
