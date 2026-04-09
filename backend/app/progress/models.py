import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class LessonStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


class Enrollment(Base, IDMixin):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("course_id", "student_id"),)

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    progress_percent: Mapped[float] = mapped_column(Numeric, default=0)


class LessonProgress(Base, IDMixin):
    __tablename__ = "lesson_progress"
    __table_args__ = (UniqueConstraint("enrollment_id", "lesson_id"),)

    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[LessonStatus] = mapped_column(
        Enum(LessonStatus), default=LessonStatus.not_started
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class VideoProgress(Base, IDMixin, TimestampMixin):
    """Per-user watch progress for a video lesson.

    One row per (user_id, lesson_id). Updated every few seconds by the
    frontend while a video is playing. `position_seconds` is where to
    resume on next open; `completed_at` is set when the user reaches 90%
    of the duration, at which point we also mark the LessonProgress as
    completed.
    """

    __tablename__ = "video_progress"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    # How many distinct seconds of the video the user has actually seen.
    # Different from position_seconds — a user can seek back and watch the
    # same segment twice but their completion progress shouldn't double-count.
    watched_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
