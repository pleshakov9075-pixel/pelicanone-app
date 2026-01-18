import uuid
from typing import Any
from pydantic import BaseModel, Field

from app.core.models.job import JOB_STATUSES, JOB_TYPES


class JobCreate(BaseModel):
    type: str = Field(..., pattern="^(" + "|".join(JOB_TYPES) + ")$")
    payload: dict[str, Any]


class JobOut(BaseModel):
    id: uuid.UUID
    type: str
    status: str
    provider: str
    payload: dict[str, Any]
    result: dict[str, Any] | None
    cost: int

    class Config:
        from_attributes = True


class JobList(BaseModel):
    items: list[JobOut]
    total: int


class JobStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(" + "|".join(JOB_STATUSES) + ")$")
