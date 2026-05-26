import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    PrimaryKeyConstraint,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class Badge(Base, IDMixin, TimestampMixin):
    __tablename__ = "badges"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    icon: Mapped[str] = mapped_column(String(50), default="star")  # emoji or icon name
    criteria_key: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "first_lesson"
    criteria: Mapped[dict] = mapped_column(JSONB, default=dict)


class UserBadge(Base, IDMixin):
    __tablename__ = "user_badges"
    __table_args__ = (UniqueConstraint("user_id", "badge_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    badge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("badges.id", ondelete="CASCADE"), nullable=False
    )
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class UserStreak(Base, IDMixin):
    __tablename__ = "user_streaks"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_date: Mapped[date | None] = mapped_column(Date)
    total_xp: Mapped[int] = mapped_column(Integer, default=0, server_default="0")


class RoomItem(Base):
    """Catalog row for a single equippable room item. String PK (e.g. 'bed-basic')
    so the spec's stable item ids survive intact and seed migrations are idempotent.
    """

    __tablename__ = "room_items"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    slot: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    group_name: Mapped[str] = mapped_column("group_name", String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    i18n_key: Mapped[str] = mapped_column(String(80), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    swatch: Mapped[str | None] = mapped_column(String(20), nullable=True)
    color_hex: Mapped[str | None] = mapped_column(String(8), nullable=True)
    floor_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # 'room' (existing room furniture/decor) or 'avatar' (character parts).
    # Frontend filters the shared catalog by this flag.
    item_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="room", server_default="room", index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class UserRoomEquip(Base):
    """Per-student equip state for one slot. Composite PK (user_id, slot).
    item_id NULL = slot explicitly toggled off (the user hid this decor).
    """

    __tablename__ = "user_room_equips"
    __table_args__ = (PrimaryKeyConstraint("user_id", "slot", name="pk_user_room_equips"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    slot: Mapped[str] = mapped_column(String(40), nullable=False)
    item_id: Mapped[str | None] = mapped_column(
        String(60), ForeignKey("room_items.id", ondelete="SET NULL"), nullable=True
    )
    offset_dx: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    offset_dz: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=lambda: datetime.now(),
    )


