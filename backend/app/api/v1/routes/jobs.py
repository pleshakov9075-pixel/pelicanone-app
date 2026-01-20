import datetime as dt
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from redis import Redis
from rq.job import Job, NoSuchJobError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_rq_queue
from app.core.repositories.jobs import JobRepository
from app.core.schemas import JobCreate, JobList, JobOut, JobResultOut, JobStatusOut
from app.core.services.jobs import JobService
from app.core.settings import get_settings
from app.db import get_session
from app.workers.tasks import run_job

router = APIRouter(prefix="/jobs", tags=["jobs"])
settings = get_settings()


def _get_rq_job(job_id: str) -> Job:
    redis = Redis.from_url(settings.redis_url)
    return Job.fetch(job_id, connection=redis)


def _map_rq_status(status_name: str) -> str:
    return {
        "queued": "queued",
        "started": "started",
        "finished": "finished",
        "failed": "failed",
        "deferred": "queued",
        "scheduled": "queued",
    }.get(status_name, status_name)


async def _ensure_job_owner(job_id: uuid.UUID, user_id: uuid.UUID, session: AsyncSession) -> None:
    repo = JobRepository(session)
    job = await repo.get_job(job_id)
    if not job or job.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found")


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

    queue.enqueue(run_job, str(job.id), result_ttl=86400)
    return job


@router.get("/{job_id}", response_model=JobStatusOut)
async def get_job(
    job_id: uuid.UUID,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo = JobRepository(session)
    job = await repo.get_job(job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found")
    try:
        rq_job = _get_rq_job(str(job_id))
    except NoSuchJobError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found") from exc
    status_name = _map_rq_status(rq_job.get_status())
    error = rq_job.exc_info if status_name == "failed" else None
    result = job.result if status_name == "finished" else None
    return JobStatusOut(status=status_name, error=error, result=result, progress=None)


@router.get("/{job_id}/result", response_model=JobResultOut)
async def get_job_result(
    job_id: uuid.UUID,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _ensure_job_owner(job_id, user.id, session)
    try:
        rq_job = _get_rq_job(str(job_id))
    except NoSuchJobError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found") from exc
    status_name = _map_rq_status(rq_job.get_status())
    if status_name == "failed":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"status": "failed", "error": rq_job.exc_info},
        )
    if status_name != "finished":
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"status": status_name})
    return JobResultOut(status="finished", result=rq_job.result)


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
    job.finished_at = dt.datetime.utcnow()
    await session.commit()
    return job
