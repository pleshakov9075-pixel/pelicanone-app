import logging

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.telegram import verify_init_data
from app.core.models.user import User
from app.core.repositories.users import UserRepository
from app.db import get_session
from app.workers.rq import get_queue

logger = logging.getLogger(__name__)


async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> User:
    init_data = request.headers.get("X-Telegram-InitData")
    if not init_data:
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
