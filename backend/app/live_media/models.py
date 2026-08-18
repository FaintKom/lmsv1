from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class LiveBreakoutGroup(Base, IDMixin, TimestampMixin):
    """One subdivision of a live lesson's room.

    Rows live only as long as their lesson: ending it deletes every group, so
    nobody is left in a room that belongs to no lesson (FR-018) and the table
    stays small.

    Written and then deleted during slice 1, on purpose — a model in
    ``Base.metadata`` with no migration is created by ``create_all`` in
    development and never reaches production. It arrives here with its
    migration and the code that reads it.
    """

    __tablename__ = "live_breakout_groups"
    __table_args__ = (UniqueConstraint("live_lesson_id", "index", name="uq_breakout_lesson_index"),)

    live_lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("live_lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Denormalised from the lesson so a scoping query never joins through it.
    # Tenant isolation is checked often enough that it should be cheap.
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    # 1-based, in the order the teacher created them. Shown as the group's name
    # and used as the suffix of its media room.
    index: Mapped[int] = mapped_column(Integer, nullable=False)
    # A group is read and written whole, so a join table would cost two queries
    # to render one panel and buy nothing.
    member_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
