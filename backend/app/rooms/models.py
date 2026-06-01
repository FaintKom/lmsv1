"""Managed physical rooms (org-level).

A :class:`Room` is a bookable physical location an org maintains (e.g. "Room
101", "Science Lab"). Schedule slots optionally reference a room via
``ScheduleSlot.room_id`` so the timetable can resolve a room name and detect
double-bookings (two active slots in the same room overlapping in time on the
same weekday).

This is distinct from the cosmetic "My Room" gamification catalog
(``room_items`` / ``user_room_equips``), which is unrelated.
"""
import uuid

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class Room(Base, IDMixin, TimestampMixin):
    """One managed room belonging to an organization."""

    __tablename__ = "rooms"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Legacy free-text site label — kept for back-compat. The structured branch
    # link is ``site_id`` below (Phase E1); ``site`` is no longer the source of
    # truth but is never dropped.
    site: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    # ── Phase E1: offline/online rooms + branch link (all additive) ──
    # 'offline' = physical room at a site; 'online' = virtual meeting room
    # (site_id NULL → org-wide pool, meeting_url set). The session format is
    # derived from ``kind``, not a per-slot flag.
    kind: Mapped[str] = mapped_column(
        String(16), nullable=False, default="offline", server_default="offline"
    )
    meeting_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (Index("ix_rooms_org", "org_id"),)
