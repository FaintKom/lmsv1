"""Sites (branches / campuses) — org-level reference data.

A :class:`Site` is a physical branch/campus an organization runs. Rooms live at
a site (``rooms.site_id``); offline-room clash detection is scoped *within* a
site (two rooms with the same name at different sites never clash), while online
rooms (``site_id IS NULL``) form an org-wide pool. Even single-branch orgs get
one site so the model is uniform.

Mirrors the org-level layout of ``app/rooms/`` (model / service / router).
"""
import uuid

from sqlalchemy import Boolean, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class Site(Base, IDMixin, TimestampMixin):
    """One branch/campus belonging to an organization."""

    __tablename__ = "sites"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    # IANA timezone of the site (local times on a slot are interpreted here).
    timezone: Mapped[str] = mapped_column(
        String(64), nullable=False, default="Europe/Berlin", server_default="Europe/Berlin"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    __table_args__ = (Index("ix_sites_org", "org_id"),)
