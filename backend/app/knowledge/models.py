"""Knowledge base — distilled atomic edtech entries with RAG support.

One Entry = one atomic concept / tool / framework / method / etc.
Sources are technical references back to the raw .md materials on disk.
Embedding column powers semantic search via pgvector.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin


class EntryType(str, enum.Enum):
    concept = "concept"
    insight = "insight"
    tool = "tool"
    framework = "framework"
    method = "method"
    template = "template"
    exercise = "exercise"
    case_study = "case_study"


class EntryStatus(str, enum.Enum):
    """Lifecycle:
    draft     -> just extracted, not yet verified
    verified  -> passed independent AI verification, public
    rejected  -> verifier flagged issues; hidden until manual review
    archived  -> superseded / removed from active rotation but kept
    """

    draft = "draft"
    verified = "verified"
    rejected = "rejected"
    archived = "archived"


class EntryVisibility(str, enum.Enum):
    public = "public"  # methodists/teachers can see in LMS
    private = "private"  # admin (you) only


class SourceType(str, enum.Enum):
    skillbox = "skillbox"
    prog_tools = "prog_tools"
    telegram = "telegram"
    web = "web"
    book = "book"
    own = "own"


class Entry(Base, IDMixin, TimestampMixin):
    """Atomic edtech knowledge entry."""

    __tablename__ = "knowledge_entries"

    type: Mapped[EntryType] = mapped_column(Enum(EntryType, name="knowledge_entry_type"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    applicability: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Four facets — string arrays. App-layer validates against known values
    # so we can add new values without a migration.
    stage: Mapped[list[str]] = mapped_column(ARRAY(String(40)), nullable=False, default=list, server_default="{}")
    audience: Mapped[list[str]] = mapped_column(ARRAY(String(40)), nullable=False, default=list, server_default="{}")
    mode: Mapped[list[str]] = mapped_column(ARRAY(String(40)), nullable=False, default=list, server_default="{}")
    problems: Mapped[list[str]] = mapped_column(ARRAY(String(40)), nullable=False, default=list, server_default="{}")

    # Free-form tags (no enum)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(80)), nullable=False, default=list, server_default="{}")

    # Lifecycle
    status: Mapped[EntryStatus] = mapped_column(
        Enum(EntryStatus, name="knowledge_entry_status"),
        nullable=False,
        default=EntryStatus.draft,
        server_default="draft",
    )
    visibility: Mapped[EntryVisibility] = mapped_column(
        Enum(EntryVisibility, name="knowledge_entry_visibility"),
        nullable=False,
        default=EntryVisibility.public,
        server_default="public",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Quality / verification
    ai_quality: Mapped[float | None] = mapped_column(Float, nullable=True)
    verifier_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    verifier_issues: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Embedding for RAG (Voyage 3-large = 1024 dims)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024), nullable=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    sources: Mapped[list["EntrySource"]] = relationship(
        back_populates="entry", cascade="all, delete-orphan"
    )


class EntrySource(Base, IDMixin, TimestampMixin):
    """Technical reference back to a raw source (skillbox URL, telegram msg, file on disk).
    Not exposed in public UI — for the admin (you) to trace provenance."""

    __tablename__ = "knowledge_entry_sources"

    entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_entries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="knowledge_source_type"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Path to the raw .md on disk in F:\sources\_archive\... — for re-extraction
    raw_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    entry: Mapped["Entry"] = relationship(back_populates="sources")
