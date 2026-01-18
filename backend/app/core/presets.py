from __future__ import annotations

from typing import Any

PRESET_DEFINITIONS: list[dict[str, Any]] = [
    {
        "id": "text",
        "label": "Text",
        "job_type": "text",
        "network_id": "grok-4-1",
        "fields": [
            {"name": "prompt", "label": "Prompt", "type": "string", "required": True},
            {
                "name": "temperature",
                "label": "Temperature",
                "type": "number",
                "required": False,
                "default": 0.7,
            },
            {
                "name": "max_tokens",
                "label": "Max tokens",
                "type": "number",
                "required": False,
                "default": 512,
            },
            {
                "name": "translate_input",
                "label": "Translate input",
                "type": "boolean",
                "required": False,
                "default": False,
            },
        ],
    },
    {
        "id": "image",
        "label": "Image",
        "job_type": "image",
        "network_id": "gpt-image-1-5",
        "fields": [
            {"name": "prompt", "label": "Prompt", "type": "string", "required": True},
            {
                "name": "image_size",
                "label": "Image size",
                "type": "string",
                "required": False,
                "default": "1024x1024",
                "enum": ["1024x1024", "1024x1536", "1536x1024"],
            },
            {
                "name": "quality",
                "label": "Quality",
                "type": "string",
                "required": False,
                "default": "medium",
                "enum": ["low", "medium", "high"],
            },
            {
                "name": "translate_input",
                "label": "Translate input",
                "type": "boolean",
                "required": False,
                "default": False,
            },
        ],
    },
    {
        "id": "video",
        "label": "Video",
        "job_type": "video",
        "network_id": "veo-3.1",
        "fields": [
            {"name": "prompt", "label": "Prompt", "type": "string", "required": True},
            {
                "name": "mode",
                "label": "Mode",
                "type": "string",
                "required": False,
                "default": "txt2video",
                "enum": ["txt2video", "img2video"],
            },
            {
                "name": "duration",
                "label": "Duration",
                "type": "number",
                "required": False,
                "default": 8,
                "enum": [5, 8, 10],
            },
            {
                "name": "resolution",
                "label": "Resolution",
                "type": "string",
                "required": False,
                "default": "720p",
                "enum": ["720p", "1080p"],
            },
            {
                "name": "aspect_ratio",
                "label": "Aspect ratio",
                "type": "string",
                "required": False,
                "default": "16:9",
                "enum": ["16:9", "9:16", "1:1"],
            },
            {
                "name": "generate_audio",
                "label": "Generate audio",
                "type": "boolean",
                "required": False,
                "default": False,
            },
            {
                "name": "translate_input",
                "label": "Translate input",
                "type": "boolean",
                "required": False,
                "default": False,
            },
        ],
    },
    {
        "id": "music",
        "label": "Music",
        "job_type": "audio",
        "network_id": "suno",
        "fields": [
            {"name": "prompt", "label": "Prompt", "type": "string", "required": True},
            {"name": "title", "label": "Title", "type": "string", "required": True},
            {"name": "tags", "label": "Tags", "type": "string", "required": True},
            {
                "name": "model",
                "label": "Model",
                "type": "string",
                "required": False,
                "default": "v5",
            },
            {
                "name": "translate_input",
                "label": "Translate input",
                "type": "boolean",
                "required": False,
                "default": False,
            },
        ],
    },
    {
        "id": "tts",
        "label": "TTS",
        "job_type": "audio",
        "network_id": "tts-eleven-v3",
        "fields": [
            {"name": "text", "label": "Text", "type": "string", "required": True},
            {
                "name": "voice",
                "label": "Voice",
                "type": "string",
                "required": False,
                "default": "Alice",
            },
            {
                "name": "stability",
                "label": "Stability",
                "type": "string",
                "required": False,
                "default": "model",
            },
            {
                "name": "similarity_boost",
                "label": "Similarity boost",
                "type": "string",
                "required": False,
                "default": "model",
            },
            {
                "name": "style",
                "label": "Style",
                "type": "string",
                "required": False,
                "default": "model",
            },
        ],
    },
    {
        "id": "stt",
        "label": "STT",
        "job_type": "audio",
        "network_id": "silero-vad",
        "fields": [
            {"name": "audio_url", "label": "Audio URL", "type": "string", "required": True}
        ],
    },
    {
        "id": "upscale_image",
        "label": "Upscale image",
        "job_type": "upscale",
        "network_id": "seedvr",
        "fields": [
            {"name": "image_url", "label": "Image URL", "type": "string", "required": True},
            {
                "name": "upscale_factor",
                "label": "Upscale factor",
                "type": "number",
                "required": False,
                "default": 2,
            },
        ],
    },
    {
        "id": "upscale_video",
        "label": "Upscale video",
        "job_type": "upscale",
        "network_id": "seedvr-video",
        "fields": [
            {"name": "video_url", "label": "Video URL", "type": "string", "required": True},
            {
                "name": "upscale_factor",
                "label": "Upscale factor",
                "type": "number",
                "required": False,
                "default": 2,
            },
        ],
    },
]


def list_presets() -> list[dict[str, Any]]:
    return PRESET_DEFINITIONS


def get_preset_by_network_id(network_id: str) -> dict[str, Any] | None:
    for preset in PRESET_DEFINITIONS:
        if preset["network_id"] == network_id:
            return preset
    return None


def normalize_payload(job_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("invalid_payload")
    if "function_id" in payload or "implementation" in payload:
        raise ValueError("function_id_not_allowed")
    network_id = payload.get("network_id")
    if not network_id:
        raise ValueError("missing_network_id")
    preset = get_preset_by_network_id(network_id)
    if not preset:
        raise ValueError("unknown_network_id")
    if preset["job_type"] != job_type:
        raise ValueError("job_type_mismatch")

    params = payload.get("params") or {}
    if not isinstance(params, dict):
        raise ValueError("invalid_params")

    fields = preset.get("fields", [])
    required_fields = [field for field in fields if field.get("required")]
    optional_fields = [field for field in fields if not field.get("required")]
    allowed_names = {field["name"] for field in fields}

    for key in params.keys():
        if key not in allowed_names:
            raise ValueError(f"unknown_param:{key}")

    normalized_params: dict[str, Any] = {}

    for field in required_fields:
        name = field["name"]
        if name not in params:
            raise ValueError(f"missing_param:{name}")
        value = params.get(name)
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValueError(f"missing_param:{name}")
        _validate_field_value(field, value)
        normalized_params[name] = value

    for field in optional_fields:
        name = field["name"]
        if name in params and params.get(name) is not None and params.get(name) != "":
            value = params.get(name)
            _validate_field_value(field, value)
            normalized_params[name] = value
            continue
        if "default" in field:
            normalized_params[name] = field["default"]

    return {"network_id": network_id, "params": normalized_params}


def _validate_field_value(field: dict[str, Any], value: Any) -> None:
    field_type = field.get("type")
    if field_type == "string":
        if not isinstance(value, str):
            raise ValueError(f"invalid_param:{field['name']}")
    elif field_type == "number":
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise ValueError(f"invalid_param:{field['name']}")
    elif field_type == "boolean":
        if not isinstance(value, bool):
            raise ValueError(f"invalid_param:{field['name']}")

    enum_values = field.get("enum")
    if enum_values and value not in enum_values:
        raise ValueError(f"invalid_param:{field['name']}")
