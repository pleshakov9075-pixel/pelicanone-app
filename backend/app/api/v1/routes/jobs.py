import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_rq_queue
from app.core.repositories.jobs import JobRepository
from app.core.schemas import JobCreate, JobList, JobOut
from app.core.services.jobs import JobService
from app.db import get_session
from app.workers.tasks import run_job

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobCreate,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    queue=Depends(get_rq_queue),
):
    service = JobService(session)
    try:
        job = await service.create_job_with_charge(user.id, payload.type, payload.payload)
        await session.commit()
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    queue.enqueue(run_job, str(job.id))
    return job


@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: uuid.UUID,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo = JobRepository(session)
    job = await repo.get_job(job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found")
    return job


@router.get("", response_model=JobList)
async def list_jobs(
    mine: int = 1,
    limit: int = 20,
    offset: int = 0,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo = JobRepository(session)
    items, total = await repo.list_jobs(user.id, limit, offset)
    return JobList(items=items, total=total)


@router.post("/{job_id}/cancel", response_model=JobOut)
async def cancel_job(
    job_id: uuid.UUID,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo = JobRepository(session)
    job = await repo.get_job(job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found")
    if job.status not in {"queued", "running"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cannot_cancel")
    job.status = "canceled"
    await session.commit()
    return job
