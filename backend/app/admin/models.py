import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin


class StudentGroup(Base, IDMixin, TimestampMixin):
    """A group/class that students can be assigned to."""
    __tablename__ = "student_groups"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

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
