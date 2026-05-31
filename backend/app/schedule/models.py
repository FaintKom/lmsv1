"""Weekly recurring timetable models.

A :class:`ScheduleSlot` is a course meeting that recurs every week on a given
day-of-week at a fixed start/end time, optionally in a room/location. This is
distinct from one-off ``calendar`` events, live ``meetings`` (Jitsi), and the
per-day ``journal``/``attendance`` register.

A course may have multiple slots on the same day (e.g. morning + afternoon),
so the table is intentionally NOT uniquely constrained on (course, day); we
only index (org_id, course_id) for lookup.
"""
import uuid
from datetime import time

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class ScheduleSlot(Base, IDMixin, TimestampMixin):
    """One recurring weekly meeting of a course."""

    __tablename__ = "schedule_slots"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    # 0 = Monday … 6 = Sunday.
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    note: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("ix_schedule_slots_org_course", "org_id", "course_id"),
    )
