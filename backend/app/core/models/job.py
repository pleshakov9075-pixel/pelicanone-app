import datetime as dt
import uuid
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models.base import Base

JOB_TYPES = ("text", "image", "video", "audio", "upscale", "edit")
JOB_STATUSES = ("queued", "running", "succeeded", "failed", "canceled")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(Enum(*JOB_TYPES, name="job_type"), nullable=False)
    status: Mapped[str] = mapped_column(Enum(*JOB_STATUSES, name="job_status"), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    cost: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=dt.datetime.utcnow,
        onupdate=dt.datetime.utcnow,
        nullable=False,
    )
