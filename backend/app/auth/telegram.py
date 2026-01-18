import hashlib
import hmac
import json
from urllib.parse import parse_qsl

from app.core.settings import get_settings

settings = get_settings()


def verify_init_data(init_data: str) -> dict:
    data = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = data.pop("hash", None)
    if not received_hash:
        raise ValueError("missing_hash")

    data_check_arr = [f"{k}={v}" for k, v in sorted(data.items())]
    data_check_string = "\n".join(data_check_arr)

    secret_key = hmac.new(b"WebAppData", settings.telegram_bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if calculated_hash != received_hash:
        raise ValueError("invalid_hash")

    user_raw = data.get("user")
    if not user_raw:
        raise ValueError("missing_user")
    return json.loads(user_raw)
