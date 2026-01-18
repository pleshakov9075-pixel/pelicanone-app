from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.telegram import verify_init_data
from app.auth.tokens import create_access_token
from app.auth.vk import verify_launch_params
from app.core.schemas import AuthOut, TelegramAuthIn, VkAuthIn
from app.core.repositories.credits import CreditRepository
from app.core.repositories.users import UserRepository
from app.core.settings import get_settings
from app.db import get_session

router = APIRouter(prefix="/auth", tags=["auth"])
DEV_START_CREDITS = 1000


@router.post("/telegram", response_model=AuthOut)
async def auth_telegram(
    payload: TelegramAuthIn, session: AsyncSession = Depends(get_session)
):
    try:
        user_info = verify_init_data(payload.initData)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    repo = UserRepository(session)
    user = await repo.get_or_create("telegram", str(user_info.get("id")))
    await session.commit()

    token = create_access_token({"user_id": str(user.id), "platform": "telegram"})
    return AuthOut(access_token=token)


@router.post("/vk", response_model=AuthOut)
async def auth_vk(payload: VkAuthIn, session: AsyncSession = Depends(get_session)):
    try:
        launch_data = verify_launch_params(payload.launchParams)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user_id = launch_data.get("vk_user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="missing_vk_user_id")

    repo = UserRepository(session)
    user = await repo.get_or_create("vk", str(user_id))
    await session.commit()

    token = create_access_token({"user_id": str(user.id), "platform": "vk"})
    return AuthOut(access_token=token)


@router.post("/dev", response_model=AuthOut)
async def auth_dev(session: AsyncSession = Depends(get_session)):
    settings = get_settings()
    if not settings.dev_auth:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")

    repo = UserRepository(session)
    user = await repo.get_or_create("web", "dev")
    credits = CreditRepository(session)
    balance = await credits.get_balance(user.id)
    if balance < DEV_START_CREDITS:
        await credits.create_tx(
            user.id, delta=DEV_START_CREDITS - balance, reason="dev_auth"
        )
    await session.commit()

    token = create_access_token({"user_id": str(user.id), "platform": "web"})
    return AuthOut(access_token=token)
