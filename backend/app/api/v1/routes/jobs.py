import datetime as dt
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_rq_queue
from app.core.repositories.credits import CreditRepository
from app.core.repositories.jobs import JobRepository
from app.core.schemas import JobCreate, JobDetailOut, JobList, JobResultOut, JobSummaryOut
from app.core.services.jobs import JobService
from app.db import get_session
from app.workers.tasks import run_job

router = APIRouter(prefix="/jobs", tags=["jobs"])


async def _ensure_job_owner(job_id: uuid.UUID, user_id: uuid.UUID, session: AsyncSession) -> None:
    repo = JobRepository(session)
    job = await repo.get_job(job_id)
    if not job or job.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found")


@router.post("", response_model=JobDetailOut, status_code=status.HTTP_201_CREATED)
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
    return JobDetailOut.model_validate(job, from_attributes=True)


@router.get("/{job_id}", response_model=JobDetailOut)
async def get_job(
    job_id: uuid.UUID,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo = JobRepository(session)
    job = await repo.get_job(job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found")
    payload = JobDetailOut.model_validate(job, from_attributes=True)
    if payload.status != "done":
        payload.result = None
    return payload


@router.get("/{job_id}/result", response_model=JobResultOut)
async def get_job_result(
    job_id: uuid.UUID,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _ensure_job_owner(job_id, user.id, session)
    repo = JobRepository(session)
    job = await repo.get_job(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found")
    if job.status == "failed":
        return JobResultOut(status="failed", error=job.error)
    if job.status != "done":
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content=JobResultOut(status=job.status).model_dump(),
        )
    return JobResultOut(status="done", result=job.result)


@router.get("", response_model=JobList)
async def list_jobs(
    mine: bool = True,
    limit: int = 20,
    offset: int = 0,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo = JobRepository(session)
    items, total = await repo.list_jobs(user.id, limit, offset)
    summaries = [JobSummaryOut.model_validate(item, from_attributes=True) for item in items]
    return JobList(items=summaries, total=total)


@router.post("/{job_id}/cancel", response_model=JobDetailOut)
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
    job.status = "failed"
    job.error = "canceled"
    job.finished_at = dt.datetime.utcnow()
    await session.commit()
    if job.cost:
        credits = CreditRepository(session)
        refunded = await credits.has_job_reason(job.id, "job_refund")
        if not refunded:
            await credits.create_tx(user.id, delta=job.cost, reason="job_refund", job_id=job.id)
            await session.commit()
    return JobDetailOut.model_validate(job, from_attributes=True)
