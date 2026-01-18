from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.repositories.credits import CreditRepository
from app.core.schemas import CreditBalance, TopUpRequest
from app.db import get_session

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/topup", response_model=CreditBalance)
async def topup(
    payload: TopUpRequest,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo = CreditRepository(session)
    await repo.create_tx(user.id, delta=payload.amount, reason="topup_mock")
    await session.commit()
    balance = await repo.get_balance(user.id)
    return CreditBalance(balance=balance)
