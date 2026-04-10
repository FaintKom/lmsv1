from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin


class TeamMemberRole(str, enum.Enum):
    leader = "leader"
    member = "member"


class TeamProject(Base, IDMixin, TimestampMixin):
    __tablename__ = "team_projects"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_team_size: Mapped[int] = mapped_column(Integer, default=4, nullable=False)

    members: Mapped[list[TeamMember]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    submissions: Mapped[list[TeamSubmission]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class TeamMember(Base, IDMixin, TimestampMixin):
    __tablename__ = "team_members"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("team_projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[TeamMemberRole] = mapped_column(
        Enum(TeamMemberRole), default=TeamMemberRole.member, nullable=False
    )

    project: Mapped[TeamProject] = relationship(back_populates="members")


class TeamSubmission(Base, IDMixin, TimestampMixin):
    __tablename__ = "team_submissions"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("team_projects.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    project: Mapped[TeamProject] = relationship(back_populates="submissions")
