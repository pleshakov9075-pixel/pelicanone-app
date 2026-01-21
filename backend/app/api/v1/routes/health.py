from fastapi import APIRouter, Request

from app.auth.telegram import TelegramInitDataError, verify_init_data

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/health/telegram")
async def health_telegram(request: Request):
    init_data = request.headers.get("X-Telegram-Init-Data")
    if not init_data:
        return {"ok": False, "reason": "missing_header"}
    try:
        payload = verify_init_data(init_data)
        user = payload.get("user") or {}
        return {
            "ok": True,
            "user": {"id": user.get("id"), "username": user.get("username")},
        }
    except TelegramInitDataError as exc:
        reason = "parse_error"
        if exc.reason in {"invalid_hash", "missing_hash"}:
            reason = "invalid_signature"
        elif exc.reason == "expired_auth_date":
            reason = "expired"
        return {"ok": False, "reason": reason, "details": exc.reason}
    except Exception:
        return {"ok": False, "reason": "parse_error", "details": "unexpected_error"}
