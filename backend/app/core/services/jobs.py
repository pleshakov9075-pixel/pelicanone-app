from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repositories.credits import CreditRepository
from app.core.repositories.jobs import JobRepository
from app.core.settings import COST_TABLE


class JobService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.jobs = JobRepository(session)
        self.credits = CreditRepository(session)

    def compute_cost(self, job_type: str) -> int:
        return getattr(COST_TABLE, job_type)

    async def create_job_with_charge(self, user_id, job_type: str, payload: dict):
        cost = self.compute_cost(job_type)
        balance = await self.credits.get_balance(user_id)
        if balance - cost < 0:
            raise ValueError("insufficient_credits")
        job = await self.jobs.create_job(user_id, job_type, payload, cost)
        await self.credits.create_tx(user_id, delta=-cost, reason="job_reserve", job_id=job.id)
        return job
