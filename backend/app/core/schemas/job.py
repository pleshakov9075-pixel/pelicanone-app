import datetime as dt
import uuid
from typing import Any
from pydantic import BaseModel, Field

from app.core.models.job import JOB_STATUSES, JOB_TYPES


class JobCreate(BaseModel):
    type: str = Field(..., pattern="^(" + "|".join(JOB_TYPES) + ")$")
    payload: dict[str, Any]


class JobSummaryOut(BaseModel):
    id: uuid.UUID
    kind: str
    status: str
    created_at: dt.datetime

    class Config:
        from_attributes = True


class JobDetailOut(BaseModel):
    id: uuid.UUID
    kind: str
    status: str
    created_at: dt.datetime
    params: dict[str, Any]
    result: dict[str, Any] | None = None
    result_files: list[dict[str, Any]] | None = None
    error: str | None = None

    class Config:
        from_attributes = True


class JobList(BaseModel):
    items: list[JobSummaryOut]
    total: int


class JobStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(" + "|".join(JOB_STATUSES) + ")$")


class JobResultOut(BaseModel):
    status: str
    result: Any | None = None
    error: str | None = None
