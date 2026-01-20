import logging
import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.telegram import verify_init_data
from app.auth.tokens import decode_token
from app.core.models.user import User
from app.core.repositories.users import UserRepository
from app.core.settings import get_settings
from app.db import get_session
from app.workers.rq import get_queue

logger = logging.getLogger(__name__)
settings = get_settings()
security = HTTPBearer(auto_error=False)


async def get_or_create_dev_user(session: AsyncSession) -> User:
    platform_user_id = settings.dev_user_platform_user_id or "dev"
    stmt = select(User).where(
        User.platform == "web", User.platform_user_id == platform_user_id
    )
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user:
        return user
    user_kwargs: dict[str, object] = {"platform": "web", "platform_user_id": platform_user_id}
    if settings.dev_user_id:
        try:
            user_kwargs["id"] = uuid.UUID(settings.dev_user_id)
        except ValueError:
            logger.warning("Invalid DEV_USER_ID, creating user with random UUID.")
    user = User(**user_kwargs)
    session.add(user)
    await session.flush()
    return user


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> User:
    if credentials:
        try:
            payload = decode_token(credentials.credentials)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token"
            ) from exc

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_not_found")
        return user

    init_data = request.headers.get("X-Telegram-InitData")
    if not init_data:
        if settings.dev_auth_bypass:
            return await get_or_create_dev_user(session)
        logger.warning(
            "auth_failed reason=telegram_initdata_missing has_initdata=%s initdata_length=%s",
            False,
            0,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="telegram_initdata_missing"
        )

    try:
        user_info = verify_init_data(init_data)
    except Exception:
        logger.warning(
            "auth_failed reason=telegram_initdata_invalid has_initdata=%s initdata_length=%s",
            True,
            len(init_data),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="telegram_initdata_invalid"
        )

    platform_user_id = user_info.get("id")
    if not platform_user_id:
        logger.warning(
            "auth_failed reason=telegram_initdata_invalid has_initdata=%s initdata_length=%s",
            True,
            len(init_data),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="telegram_initdata_invalid"
        )
    repo = UserRepository(session)
    return await repo.get_or_create("telegram", str(platform_user_id))


def get_rq_queue():
    return get_queue()
