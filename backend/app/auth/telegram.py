import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

from app.core.settings import get_settings

settings = get_settings()


class TelegramInitDataError(ValueError):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def verify_init_data(init_data: str) -> dict:
    data = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = data.pop("hash", None)
    if not received_hash:
        raise TelegramInitDataError("missing_hash")

    auth_date_raw = data.get("auth_date")
    if not auth_date_raw:
        raise TelegramInitDataError("missing_auth_date")

    data_check_arr = [f"{k}={v}" for k, v in sorted(data.items())]
    data_check_string = "\n".join(data_check_arr)

    secret_key = hmac.new(
        b"WebAppData", settings.telegram_bot_token.encode(), hashlib.sha256
    ).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise TelegramInitDataError("invalid_hash")

    try:
        auth_date = int(auth_date_raw)
    except ValueError as exc:
        raise TelegramInitDataError("invalid_auth_date") from exc

    now_ts = int(time.time())
    if now_ts - auth_date > settings.telegram_initdata_ttl_seconds:
        raise TelegramInitDataError("expired_auth_date")

    user_raw = data.get("user")
    if not user_raw:
        raise TelegramInitDataError("missing_user")
    try:
        user = json.loads(user_raw)
    except json.JSONDecodeError as exc:
        raise TelegramInitDataError("invalid_user_json") from exc
    return {"user": user, "auth_date": auth_date}
