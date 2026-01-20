from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.repositories.credits import CreditRepository
from app.core.schemas import CreditBalance, CreditLedgerList
from app.db import get_session

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/balance", response_model=CreditBalance)
async def get_balance(
    user=Depends(get_current_user), session: AsyncSession = Depends(get_session)
):
    repo = CreditRepository(session)
    balance = await repo.get_balance(user.id)
    return CreditBalance(balance=balance)


@router.get("/ledger", response_model=CreditLedgerList)
async def list_ledger(
    limit: int = 20,
    offset: int = 0,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo = CreditRepository(session)
    items, total = await repo.list_tx(user.id, limit, offset)
    return CreditLedgerList(items=items, total=total)


@router.get("/tx", response_model=CreditLedgerList)
async def list_transactions(
    limit: int = 20,
    offset: int = 0,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo = CreditRepository(session)
    items, total = await repo.list_tx(user.id, limit, offset)
    return CreditLedgerList(items=items, total=total)
