import datetime as dt
from typing import Any
import jwt

from app.core.settings import get_settings

settings = get_settings()


def create_access_token(subject: dict[str, Any]) -> str:
    payload = subject.copy()
    payload["exp"] = dt.datetime.utcnow() + dt.timedelta(minutes=settings.jwt_exp_minutes)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
