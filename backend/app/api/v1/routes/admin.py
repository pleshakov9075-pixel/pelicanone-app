from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_admin_user
from app.core.repositories.credits import CreditRepository
from app.core.repositories.users import UserRepository
from app.core.schemas.credits import AdminCreditAddRequest, AdminCreditAddResponse
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
