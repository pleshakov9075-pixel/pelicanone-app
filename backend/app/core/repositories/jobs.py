from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models.job import Job


class JobRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_job(
        self,
        user_id,
        job_type: str,
        payload: dict,
        cost: int,
        provider: str = "genapi",
    ) -> Job:
        job = Job(
            user_id=user_id,
            type=job_type,
            status="queued",
            provider=provider,
            payload=payload,
            cost=cost,
        )
        self.session.add(job)
        await self.session.flush()
        return job

    async def get_job(self, job_id):
        stmt = select(Job).where(Job.id == job_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_jobs(self, user_id, limit: int, offset: int):
        stmt = (
            select(Job)
            .where(Job.user_id == user_id)
            .order_by(Job.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        items = (await self.session.execute(stmt)).scalars().all()
        total_stmt = select(func.count()).where(Job.user_id == user_id)
        total = (await self.session.execute(total_stmt)).scalar_one()
        return items, int(total)
