import hashlib
from urllib.parse import parse_qsl

from app.core.settings import get_settings

settings = get_settings()


def verify_launch_params(params: str | dict) -> dict:
    if isinstance(params, dict):
        data = params
    else:
        data = dict(parse_qsl(params, keep_blank_values=True))
    sign = data.pop("sign", None)
    if not sign:
        raise ValueError("missing_sign")

    vk_params = {k: v for k, v in data.items() if k.startswith("vk_")}
    query = "&".join(f"{k}={vk_params[k]}" for k in sorted(vk_params))
    digest = hashlib.sha256((query + settings.vk_app_secret).encode()).hexdigest()
    if digest != sign:
        raise ValueError("invalid_sign")

    return vk_params
