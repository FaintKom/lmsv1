import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class IntegrationProvider(str, enum.Enum):
    zoom = "zoom"
    google_meet = "google_meet"
    google_drive = "google_drive"
    google_classroom = "google_classroom"
    microsoft_teams = "microsoft_teams"
    youtube = "youtube"
    stripe = "stripe"


class OAuthConnection(Base, IDMixin, TimestampMixin):
    """Stores OAuth tokens for external service connections per organization."""

    __tablename__ = "oauth_connections"
    __table_args__ = (
        Index("ix_oauth_connections_org_provider", "org_id", "provider", unique=True),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider: Mapped[IntegrationProvider] = mapped_column(
        Enum(IntegrationProvider), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # OAuth tokens (encrypted in production via application-level encryption)
    access_token: Mapped[str | None] = mapped_column(Text)
    refresh_token: Mapped[str | None] = mapped_column(Text)
    token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    # Provider-specific metadata
    account_email: Mapped[str | None] = mapped_column(String(255))
    account_name: Mapped[str | None] = mapped_column(String(255))
    scopes: Mapped[str | None] = mapped_column(Text)  # comma-separated scopes
    extra_data: Mapped[dict | None] = mapped_column(JSONB)  # provider-specific data

    # Who connected it
    connected_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
