"""Curriculum (scope & sequence) models.

A :class:`CurriculumTopic` is one ordered topic in a course's program. The
list of topics for a course is its *scope & sequence* — a course-level plan
shared by every group of that course. A group's position along the plan is
derived at read time from ``class_sessions.actual_topic_id`` (see the pacing
service); nothing about a group is stored here.

The table is ordered by ``position`` (1..N within a course). ``planned_lessons``
is how many sessions the topic is budgeted for (drives pacing "by weight");
``target_date`` is an optional planned calendar date (drives pacing "by date").
"""
import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class CurriculumTopic(Base, IDMixin, TimestampMixin):
    """One ordered topic of a course's scope & sequence."""

    __tablename__ = "curriculum_topics"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    # 1-based order within the course.
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    title: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    # Sessions budgeted for this topic (>= 1). Pacing "by weight" sums these.
    planned_lessons: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    # Optional planned calendar date for the topic (pacing "by date").
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    __table_args__ = (
        Index("ix_curriculum_topics_course_position", "course_id", "position"),
    )
