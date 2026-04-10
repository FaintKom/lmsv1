"""Webhook subscription and delivery log models (P2-12).

An organization can register one or more webhook endpoints. Each endpoint
receives POST requests for selected event types. Delivery attempts are
logged so admins can debug failures and we can implement retry logic.
"""
import enum
import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class WebhookEventType(str, enum.Enum):
    enrollment_created = "enrollment.created"
    lesson_completed = "lesson.completed"
    grade_updated = "grade.updated"
    course_completed = "course.completed"
    user_registered = "user.registered"


class WebhookEndpoint(Base, IDMixin, TimestampMixin):
    """A URL that receives webhook POST requests for an org."""

    __tablename__ = "webhook_endpoints"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    secret: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    events: Mapped[list] = mapped_column(JSONB, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class WebhookDelivery(Base, IDMixin, TimestampMixin):
    """Log of each delivery attempt for debugging and retry."""

    __tablename__ = "webhook_deliveries"

    endpoint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("webhook_endpoints.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=False)
    attempt: Mapped[int] = mapped_column(Integer, default=1)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
