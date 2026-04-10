from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class PlagiarismStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    complete = "complete"
    failed = "failed"


class PlagiarismCheck(Base, IDMixin, TimestampMixin):
    __tablename__ = "plagiarism_checks"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    submission_id: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[PlagiarismStatus] = mapped_column(
        Enum(PlagiarismStatus), default=PlagiarismStatus.pending, nullable=False
    )
    similarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    report_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    checked_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
