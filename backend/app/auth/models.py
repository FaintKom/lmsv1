import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    teacher = "teacher"
    student = "student"
    parent = "parent"


class Organization(Base, IDMixin, TimestampMixin):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)

    users: Mapped[list["User"]] = relationship(back_populates="organization")


class User(Base, IDMixin, TimestampMixin):
    __tablename__ = "users"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.student)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_methodist: Mapped[bool] = mapped_column(Boolean, default=False)
    email_preferences: Mapped[dict] = mapped_column(
        JSONB, default=lambda: {"assignments": True, "grades": True, "deadlines": True, "courses": True}
    )
    consent_accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    privacy_policy_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Child safety: school-mediated parental consent. For a child account the
    # org admin/teacher (or invite-holder) attests that verifiable parental
    # consent was obtained offline — we do NOT collect DOB. parental_consent_by
    # is the staff user who attested (null when self-attested at signup).
    parental_consent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    parental_consent_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Retention: bumped on every login/refresh so the purge job can find
    # accounts dormant past the retention window (settings.data_retention_months).
    last_active_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Null until the user clicks the verification link from their welcome email.
    # Enforcement is off by default (see settings.require_email_verification) so
    # deployments without SMTP configured keep working.
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    organization: Mapped["Organization"] = relationship(back_populates="users")


class OrganizationMembership(Base, IDMixin, TimestampMixin):
    """Links a user to an organization with a per-org role.

    Supports P2-11 "multi-org for a single user": a teacher or admin
    who works at multiple schools can have memberships in each one
    while keeping a single login. The user's "active" org is still
    tracked on `users.org_id` — switching orgs updates both
    `users.org_id` and `users.role` from the selected membership.

    For every existing user at migration time we create one membership
    row mirroring (users.org_id, users.role) so nothing breaks.
    """

    __tablename__ = "organization_memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "org_id", name="uq_org_memberships_user_org"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.student, nullable=False
    )


class ParentChild(Base, IDMixin, TimestampMixin):
    __tablename__ = "parent_children"

    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    child_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )


class PasswordResetToken(Base, IDMixin, TimestampMixin):
    __tablename__ = "password_reset_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)


class EmailVerificationToken(Base, IDMixin, TimestampMixin):
    """One-time token used to verify a user's email address."""

    __tablename__ = "email_verification_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)


class RefreshToken(Base, IDMixin, TimestampMixin):
    """Server-side tracking of issued refresh tokens so they can be revoked.

    Each refresh token JWT carries a unique `jti` (JWT ID) claim. On `/refresh`
    we look up the jti here: if not present or `revoked_at` is set, the refresh
    is rejected. On successful refresh we mark the old row revoked and create a
    new row for the newly-issued token (rotation). `/logout` revokes without
    issuing a replacement.
    """

    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    jti: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Optional audit info so we can show "active sessions" in future UI
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
