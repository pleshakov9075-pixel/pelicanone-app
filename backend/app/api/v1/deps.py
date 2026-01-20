import logging

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.telegram import TelegramInitDataError, verify_init_data
from app.core.models.user import User
from app.core.repositories.users import UserRepository
from app.core.settings import get_settings
from app.db import get_session
from app.workers.rq import get_queue

logger = logging.getLogger(__name__)
settings = get_settings()


async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> User:
    init_data = request.headers.get("X-Telegram-Init-Data")
    if not init_data:
        logger.warning(
            "auth_failed reason=telegram_initdata_missing has_initdata=%s initdata_length=%s",
            False,
            0,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram initData is required. Open the app inside Telegram.",
        )

    try:
        payload = verify_init_data(init_data)
    except TelegramInitDataError as exc:
        prefix = init_data[:30]
        logger.warning(
            "auth_failed reason=%s has_initdata=%s initdata_length=%s initdata_prefix=%s",
            exc.reason,
            True,
            len(init_data),
            prefix,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram initData signature.",
        )
    except Exception:
        prefix = init_data[:30]
        logger.warning(
            "auth_failed reason=telegram_initdata_invalid has_initdata=%s initdata_length=%s initdata_prefix=%s",
            True,
            len(init_data),
            prefix,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram initData signature.",
        )

    user_payload = payload.get("user", {})
    platform_user_id = user_payload.get("id")
    if not platform_user_id:
        prefix = init_data[:30]
        logger.warning(
            "auth_failed reason=missing_user_id has_initdata=%s initdata_length=%s initdata_prefix=%s",
            True,
            len(init_data),
            prefix,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram initData signature.",
        )
    repo = UserRepository(session)
    user, changed = await repo.get_or_create_from_telegram(user_payload)
    if changed:
        await session.commit()
    return user


async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    admin_ids = settings.parsed_admin_tg_ids()
    if not admin_ids or user.platform_user_id not in admin_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    return user


def get_rq_queue():
    return get_queue()
