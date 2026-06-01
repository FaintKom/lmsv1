import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin


class StudentGroup(Base, IDMixin, TimestampMixin):
    """A group/class that students can be assigned to.

    Phase B (group-centric scheduling): this is also the design's *group* — a
    cohort of students studying one course, with an optional teacher, default
    room, status and date span. All of the scheduling columns are **nullable
    and additive** so the historical "loose bag of students" groups keep
    working unchanged; only group-scheduled cohorts populate them.
    """
    __tablename__ = "student_groups"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    # ── Phase B: group-as-cohort-of-a-course (all nullable / additive) ──
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True
    )
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    default_room_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    # planned | active | archived. Default "active" so a backfilled/created
    # group is immediately usable.
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active"
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    members: Mapped[list["StudentGroupMember"]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )


class StudentGroupMember(Base, IDMixin, TimestampMixin):
    """M2M: student ↔ group."""
    __tablename__ = "student_group_members"

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("student_groups.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    group: Mapped["StudentGroup"] = relationship(back_populates="members")
