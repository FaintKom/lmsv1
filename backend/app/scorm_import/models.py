"""Imported SCORM/xAPI packages + internal LRS xAPI statement store.

Different from `app/scorm/` which exports a course to a SCORM package.
This module **imports** a third-party SCORM 1.2 / 2004 or xAPI package
(typically produced by Articulate Storyline / iSpring / Adobe Captivate)
and exposes it as a `scorm_package` exercise type.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class ImportedSCORMFormat(str, enum.Enum):
    scorm12 = "scorm12"
    scorm2004 = "scorm2004"
    xapi = "xapi"
    aicc = "aicc"  # rarely used; included for completeness


class ImportedSCORMStatus(str, enum.Enum):
    pending = "pending"
    extracted = "extracted"
    failed = "failed"


class ImportedSCORMPackage(Base, IDMixin, TimestampMixin):
    """A third-party SCORM/xAPI package uploaded by a teacher.

    The package zip is extracted under `<upload_dir>/scorm-import/<id>/`
    and `launch_url` is the relative path inside that directory to the
    entry point declared by imsmanifest.xml (e.g. `index_lms.html`).
    Files are served through GET /scorm-import/<id>/files/<path>.
    """

    __tablename__ = "imported_scorm_packages"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    exercise_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exercises.id", ondelete="SET NULL"), nullable=True
    )
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    original_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    format: Mapped[ImportedSCORMFormat] = mapped_column(
        Enum(ImportedSCORMFormat), nullable=False, default=ImportedSCORMFormat.scorm12
    )
    launch_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[ImportedSCORMStatus] = mapped_column(
        Enum(ImportedSCORMStatus), nullable=False, default=ImportedSCORMStatus.pending
    )
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    manifest: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class XAPIStatement(Base, IDMixin, TimestampMixin):
    """Internal LRS — stores xAPI statements emitted from imported SCORM
    packages, mathlive math exercises, and any future native xAPI emitter.

    Schema follows the xAPI 1.0.3 statement shape but stores actor/verb/
    object/result/context as JSONB blobs for forward compatibility.
    """

    __tablename__ = "xapi_statements"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verb_id: Mapped[str] = mapped_column(String(500), nullable=False)
    object_id: Mapped[str] = mapped_column(String(500), nullable=False)
    object_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    statement: Mapped[dict] = mapped_column(JSONB, nullable=False)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    context: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    stored_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Convenience fk's so we can index queries like "all statements about exercise X"
    exercise_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exercises.id", ondelete="SET NULL"), nullable=True
    )
    imported_package_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("imported_scorm_packages.id", ondelete="SET NULL"),
        nullable=True,
    )
