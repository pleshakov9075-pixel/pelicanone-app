from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models.credit_ledger import CreditLedger
from app.core.models.user import User


class CreditRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_balance(self, user_id) -> int:
        stmt = select(User.balance).where(User.id == user_id)
        result = await self.session.execute(stmt)
        balance = result.scalar_one_or_none()
        return int(balance or 0)

    async def lock_user(self, user_id) -> User:
        stmt = select(User).where(User.id == user_id).with_for_update()
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def list_tx(self, user_id, limit: int, offset: int):
        stmt = (
            select(CreditLedger)
            .where(CreditLedger.user_id == user_id)
            .order_by(CreditLedger.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        items = (await self.session.execute(stmt)).scalars().all()
        total_stmt = select(func.count()).where(CreditLedger.user_id == user_id)
        total = (await self.session.execute(total_stmt)).scalar_one()
        return items, int(total)

    async def create_tx_for_user(
        self, user: User, delta: int, reason: str, job_id=None
    ) -> CreditLedger:
        user.balance += delta
        tx = CreditLedger(user_id=user.id, delta=delta, reason=reason, job_id=job_id)
        self.session.add(tx)
        await self.session.flush()
        return tx

    async def create_tx(self, user_id, delta: int, reason: str, job_id=None) -> CreditLedger:
        user = await self.lock_user(user_id)
        return await self.create_tx_for_user(user, delta=delta, reason=reason, job_id=job_id)

    async def has_job_reason(self, job_id, reason: str) -> bool:
        stmt = select(func.count()).where(
            CreditLedger.job_id == job_id, CreditLedger.reason == reason
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one()) > 0
