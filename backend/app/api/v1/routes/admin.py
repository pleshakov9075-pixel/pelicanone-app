from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_admin_user
from app.core.repositories.credits import CreditRepository
from app.core.repositories.users import UserRepository
from app.core.schemas.credits import (
    AdminCreditAddRequest,
    AdminCreditAddResponse,
    AdminTopupRequest,
    AdminTopupResponse,
)
from app.core.settings import get_settings
from app.db import get_session

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/credits/add", response_model=AdminCreditAddResponse)
async def add_credits(
    payload: AdminCreditAddRequest,
    _admin=Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    users = UserRepository(session)
    user = await users.get_by_platform_user_id("telegram", str(payload.platform_user_id))
    if not user:
        user, _ = await users.get_or_create_from_telegram(
            {
                "id": payload.platform_user_id,
            }
        )
    credits = CreditRepository(session)
    await credits.create_tx(user.id, delta=payload.amount, reason="admin_topup")
    await session.commit()
    balance = await credits.get_balance(user.id)
    return AdminCreditAddResponse(platform_user_id=payload.platform_user_id, balance=balance)


@router.post("/topup", response_model=AdminTopupResponse)
async def admin_topup(
    payload: AdminTopupRequest,
    session: AsyncSession = Depends(get_session),
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
):
    settings = get_settings()
    if not settings.admin_api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    if not x_admin_key or x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    if payload.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="amount_must_be_positive",
        )
    users = UserRepository(session)
    platform_user_id = str(payload.user_id)
    user = await users.get_by_platform_user_id("telegram", platform_user_id)
    if not user:
        user, _ = await users.get_or_create_from_telegram({"id": payload.user_id})
    credits = CreditRepository(session)
    tx = await credits.create_tx(user.id, delta=payload.amount, reason=payload.reason)
    await session.commit()
    balance = await credits.get_balance(user.id)
    return AdminTopupResponse(
        ok=True, user_id=payload.user_id, new_balance=balance, ledger_id=tx.id
    )
