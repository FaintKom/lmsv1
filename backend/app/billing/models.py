import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    past_due = "past_due"
    canceled = "canceled"
    trialing = "trialing"


class InvoiceStatus(str, enum.Enum):
    paid = "paid"
    open = "open"
    void = "void"
    uncollectible = "uncollectible"


class Plan(Base, IDMixin, TimestampMixin):
    __tablename__ = "plans"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    stripe_price_id: Mapped[str] = mapped_column(String(255), nullable=False)
    price_monthly: Mapped[float] = mapped_column(Numeric, nullable=False)
    max_students: Mapped[int] = mapped_column(Integer, default=-1)
    max_courses: Mapped[int] = mapped_column(Integer, default=-1)
    features: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class BillingProvider(str, enum.Enum):
    """Where this subscription/invoice lives — Stripe or Lemon Squeezy.

    Stored as a plain string column (not a PG enum) so adding a third
    provider is a no-op migration.
    """
    stripe = "stripe"
    lemonsqueezy = "lemonsqueezy"


class Subscription(Base, IDMixin, TimestampMixin):
    __tablename__ = "subscriptions"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plans.id"), nullable=False
    )
    # Which payment processor owns this subscription. Exactly one of
    # stripe_subscription_id / ls_subscription_id is populated per row.
    provider: Mapped[str] = mapped_column(
        String(20), nullable=False, default=BillingProvider.stripe.value
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ls_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ls_variant_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ls_customer_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus), default=SubscriptionStatus.active
    )
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Invoice(Base, IDMixin):
    __tablename__ = "invoices"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(
        String(20), nullable=False, default=BillingProvider.stripe.value
    )
    stripe_invoice_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ls_invoice_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(Enum(InvoiceStatus), nullable=False)
    invoice_url: Mapped[str | None] = mapped_column(String(500))
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
