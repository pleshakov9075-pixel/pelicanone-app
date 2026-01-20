import datetime as dt
import uuid
from sqlalchemy import DateTime, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    platform: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="telegram",
        server_default=text("'telegram'"),
    )
    platform_user_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=dt.datetime.utcnow,
        server_default=text("now()"),
        nullable=False,
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=dt.datetime.utcnow,
        server_default=text("now()"),
        onupdate=dt.datetime.utcnow,
        nullable=False,
    )
