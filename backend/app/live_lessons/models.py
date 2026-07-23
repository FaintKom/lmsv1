"""Live lesson models.

A LiveLesson is one real-time class run by a teacher for a StudentGroup.
Live state (scene, presence, signals, polls) lives in Redis with TTLs;
these tables hold the durable part: the lesson row, its boards and the
per-exercise drafts students autosave during a lesson.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class LiveLesson(Base, IDMixin, TimestampMixin):
    __tablename__ = "live_lessons"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("student_groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
    )
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    class_session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("class_sessions.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    follow_mode: Mapped[str] = mapped_column(String(10), nullable=False, default="free")
    # Mirror of the Redis scene key — survives a Redis restart.
    current_scene: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class LessonBoard(Base, IDMixin, TimestampMixin):
    __tablename__ = "lesson_boards"

    live_lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("live_lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="board")
    scene: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    material_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)


class ExerciseDraft(Base, IDMixin, TimestampMixin):
    __tablename__ = "exercise_drafts"
    __table_args__ = (
        UniqueConstraint("exercise_id", "student_id", name="uq_exercise_drafts_ex_student"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exercises.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    answers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    source_code: Mapped[str | None] = mapped_column(Text, nullable=True)
