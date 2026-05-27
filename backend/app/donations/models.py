"""Donation model — stores OC orders initiated from /support.

Donations live outside the multi-tenant org boundary because they are
fiscal-host-level events. Donor data is PII; webhook payloads can
contain card last4 and are treated accordingly (excluded from logs and
from /stats).
"""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class Recurrence(str, enum.Enum):
    one_time = "one_time"
    monthly = "monthly"


class DonationStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    failed = "failed"


class Donation(Base, IDMixin, TimestampMixin):
    __tablename__ = "donations"

    oc_order_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    recurrence: Mapped[Recurrence] = mapped_column(
        Enum(Recurrence, name="donation_recurrence"), nullable=False, default=Recurrence.one_time
    )
    donor_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    donor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[DonationStatus] = mapped_column(
        Enum(DonationStatus, name="donation_status"), nullable=False, default=DonationStatus.pending, index=True
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raw_webhook: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
