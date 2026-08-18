from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class RecordingType(str, enum.Enum):
    video = "video"
    audio = "audio"


class RecordingStatus(str, enum.Enum):
    uploading = "uploading"
    ready = "ready"
    failed = "failed"


class Recording(Base, IDMixin, TimestampMixin):
    __tablename__ = "recordings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[RecordingType] = mapped_column(Enum(RecordingType), nullable=False)
    storage_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[RecordingStatus] = mapped_column(
        Enum(RecordingStatus), default=RecordingStatus.uploading, nullable=False
    )
    # Null for anything recorded outside a lesson, which is every row that
    # existed before live lessons could be recorded at all.
    live_lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("live_lessons.id", ondelete="SET NULL"), nullable=True
    )
    # False means staff of the school only. Handing a recording to the class is
    # the teacher's deliberate act, not a side effect of making one (FR-021).
    shared_with_group: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Written at completion from the school's retention setting. The sweep
    # deletes the row and the bytes together once it passes (FR-023).
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
