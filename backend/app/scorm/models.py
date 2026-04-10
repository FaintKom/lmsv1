from __future__ import annotations

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class SCORMFormat(str, enum.Enum):
    scorm12 = "scorm12"
    scorm2004 = "scorm2004"
    xapi = "xapi"


class SCORMStatus(str, enum.Enum):
    pending = "pending"
    building = "building"
    ready = "ready"
    failed = "failed"


class SCORMPackage(Base, IDMixin, TimestampMixin):
    __tablename__ = "scorm_packages"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    format: Mapped[SCORMFormat] = mapped_column(Enum(SCORMFormat), nullable=False)
    status: Mapped[SCORMStatus] = mapped_column(
        Enum(SCORMStatus), default=SCORMStatus.pending, nullable=False
    )
    download_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
