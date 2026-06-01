"""Managed-rooms service + RBAC.

Rooms are org-level (not tied to a single course), so authorization differs
slightly from the course-scoped schedule/journal helpers:

  - read  (list)              → any staff role in the org (teacher needs it for
                                the room dropdown). super_admin sees every org.
  - write (create/update/del) → methodist / admin / super_admin only. A plain
                                teacher may NOT mutate the org room list.

Org isolation: a room belongs to exactly one org; cross-org access is hidden as
``not_found`` (mirrors ``_authorize_course``). We reuse ``TaskStatsError`` for a
consistent error contract across the staff surface.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.task_stats_service import TaskStatsError
from app.auth.models import User, UserRole
from app.rooms.models import Room


def _require_read_role(user: User) -> None:
    """Any staff role may read the org room list (teacher needs the dropdown)."""
    if user.role in (UserRole.student, UserRole.parent):
        raise TaskStatsError("forbidden", "Role cannot view rooms")


def _require_write_role(user: User) -> None:
    """Only methodist / admin / super_admin may mutate the org room list."""
    if user.role == UserRole.super_admin:
        return
    if user.role == UserRole.admin or bool(user.is_methodist):
        return
    raise TaskStatsError("forbidden", "Only coordinators may manage rooms")


def _room_to_dict(r: Room) -> dict:
    return {
        "id": str(r.id),
        "org_id": str(r.org_id),
        "name": r.name,
        "capacity": r.capacity,
        "site": r.site or "",
        "active": r.active,
    }


async def _get_authorized_room(
    db: AsyncSession, user: User, room_id: uuid.UUID
) -> Room:
    room = await db.scalar(select(Room).where(Room.id == room_id))
    if room is None:
        raise TaskStatsError("not_found", "Room not found")
    # Hide existence across orgs (super_admin sees all).
    if user.role != UserRole.super_admin and room.org_id != user.org_id:
        raise TaskStatsError("not_found", "Room not found")
    return room


# ── Reads ────────────────────────────────────────────────────────────────


async def list_rooms(
    db: AsyncSession, user: User, *, include_inactive: bool = True
) -> list[dict]:
    """Rooms in the caller's org (super_admin: all orgs), ordered by name."""
    _require_read_role(user)
    stmt = select(Room).order_by(Room.name)
    if user.role != UserRole.super_admin:
        stmt = stmt.where(Room.org_id == user.org_id)
    if not include_inactive:
        stmt = stmt.where(Room.active.is_(True))
    rows = (await db.execute(stmt)).scalars().all()
    return [_room_to_dict(r) for r in rows]


# ── Writes ───────────────────────────────────────────────────────────────


async def create_room(
    db: AsyncSession,
    user: User,
    *,
    name: str,
    capacity: int | None = None,
    site: str = "",
) -> dict:
    _require_write_role(user)
    if user.org_id is None:
        raise TaskStatsError("bad_request", "User has no organization")
    room = Room(
        org_id=user.org_id,
        name=name.strip()[:120],
        capacity=capacity,
        site=(site or "").strip()[:120],
        active=True,
    )
    db.add(room)
    await db.flush()
    return _room_to_dict(room)


async def update_room(
    db: AsyncSession,
    user: User,
    room_id: uuid.UUID,
    *,
    name: str | None = None,
    capacity: int | None = None,
    capacity_set: bool = False,
    site: str | None = None,
    active: bool | None = None,
) -> dict:
    _require_write_role(user)
    room = await _get_authorized_room(db, user, room_id)
    if name is not None:
        room.name = name.strip()[:120]
    # capacity is nullable: ``capacity_set`` distinguishes "set to None" from
    # "leave unchanged" so a coordinator can clear a capacity.
    if capacity_set:
        room.capacity = capacity
    if site is not None:
        room.site = site.strip()[:120]
    if active is not None:
        room.active = active
    db.add(room)
    await db.flush()
    return _room_to_dict(room)


async def delete_room(db: AsyncSession, user: User, room_id: uuid.UUID) -> None:
    _require_write_role(user)
    room = await _get_authorized_room(db, user, room_id)
    # schedule_slots.room_id is ON DELETE SET NULL, so slots keep their free-text
    # location and simply drop the managed-room link.
    await db.delete(room)
    await db.flush()
