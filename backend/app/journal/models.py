"""Class journal models.

A :class:`ClassSession` is the per-day register row for a course: did the
session happen, what was the topic, free-form notes. Exactly one row per
(course, date) — enforced by a unique constraint. Attendance for the same
(course, date) lives in :class:`app.attendance.models.AttendanceRecord` and is
NOT duplicated here.
"""
import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class ClassSession(Base, IDMixin, TimestampMixin):
    """One journal row per course-day."""

    __tablename__ = "class_sessions"
    __table_args__ = (
        UniqueConstraint("course_id", "session_date", name="uq_class_sessions_course_date"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    held: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    topic: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
