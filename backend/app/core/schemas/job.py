import datetime as dt
import uuid
from typing import Any
from pydantic import BaseModel, Field, computed_field

from app.core.models.job import JOB_STATUSES, JOB_TYPES
from app.core.presets import get_preset_eta_seconds


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
    started_at: dt.datetime | None = None
    finished_at: dt.datetime | None = None
    queue_position: int | None = None

    class Config:
        from_attributes = True

    @computed_field(return_type=int | None)
    def eta_seconds(self) -> int | None:
        return get_preset_eta_seconds(self.payload)


class JobList(BaseModel):
    items: list[JobOut]
    total: int


class JobStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(" + "|".join(JOB_STATUSES) + ")$")
