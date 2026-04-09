"""Pre-launch waitlist — captured emails + optional context from visitors.

These rows are NOT users. They're prospects who have shown interest via
the public /waitlist form but haven't signed up yet. Used for:
- Early-access invitations
- Launch announcements
- Cold outreach follow-up
- Segment analysis (what roles / school sizes are interested)
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class WaitlistEntry(Base, IDMixin, TimestampMixin):
    __tablename__ = "waitlist_entries"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    # Free-form context field — "I run a SAT prep center", "High school
    # CS teacher", etc. Optional, lets us segment prospects later.
    role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Stashed HTTP context for fraud / abuse attribution
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Flipped to true once the prospect has been contacted / invited
    contacted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    contacted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
