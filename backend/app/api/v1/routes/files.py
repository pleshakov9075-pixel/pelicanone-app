import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.job_files import resolve_job_file_path, storage_root
from app.core.repositories.jobs import JobRepository
from app.db import get_session

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/{job_id}/{filename}")
async def get_job_file(
    job_id: uuid.UUID,
    filename: str,
    user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo = JobRepository(session)
    job = await repo.get_job(job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="job_not_found")
    if job.result_files:
        allowed = {item.get("filename") for item in job.result_files if isinstance(item, dict)}
        if filename not in allowed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file_not_found")

    file_path = resolve_job_file_path(str(job_id), filename)
    root = storage_root().resolve()
    try:
        resolved_path = file_path.resolve()
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file_not_found")
    if not str(resolved_path).startswith(str(root)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file_not_found")
    if not resolved_path.exists() or not resolved_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file_not_found")
    return FileResponse(resolved_path)
