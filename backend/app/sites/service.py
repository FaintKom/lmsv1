"""Sites service + RBAC.

Sites are org-level reference data (branches/campuses), so authorization mirrors
``rooms.service`` exactly:

  - read  (list)              → any staff role in the org (teacher needs it for
                                the site dropdown). super_admin sees every org.
  - write (create/update/del) → methodist / admin / super_admin only.

Org isolation: a site belongs to exactly one org; cross-org access is hidden as
``not_found``. We reuse ``TaskStatsError`` for a consistent error contract.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.task_stats_service import TaskStatsError
from app.auth.models import User, UserRole
from app.sites.models import Site

DEFAULT_TIMEZONE = "Europe/Berlin"


def _require_read_role(user: User) -> None:
    """Any staff role may read the org site list (teacher needs the dropdown)."""
    if user.role in (UserRole.student, UserRole.parent):
        raise TaskStatsError("forbidden", "Role cannot view sites")


def _require_write_role(user: User) -> None:
    """Only methodist / admin / super_admin may mutate the org site list."""
    if user.role == UserRole.super_admin:
        return
    if user.role == UserRole.admin or bool(user.is_methodist):
        return
    raise TaskStatsError("forbidden", "Only coordinators may manage sites")


def _site_to_dict(s: Site) -> dict:
    return {
        "id": str(s.id),
        "org_id": str(s.org_id),
        "name": s.name,
        "timezone": s.timezone or DEFAULT_TIMEZONE,
        "is_active": s.is_active,
    }


async def _get_authorized_site(
    db: AsyncSession, user: User, site_id: uuid.UUID
) -> Site:
    site = await db.scalar(select(Site).where(Site.id == site_id))
    if site is None:
        raise TaskStatsError("not_found", "Site not found")
    # Hide existence across orgs (super_admin sees all).
    if user.role != UserRole.super_admin and site.org_id != user.org_id:
        raise TaskStatsError("not_found", "Site not found")
    return site


# ── Reads ────────────────────────────────────────────────────────────────


async def list_sites(
    db: AsyncSession, user: User, *, include_inactive: bool = True
) -> list[dict]:
    """Sites in the caller's org (super_admin: all orgs), ordered by name."""
    _require_read_role(user)
    stmt = select(Site).order_by(Site.name)
    if user.role != UserRole.super_admin:
        stmt = stmt.where(Site.org_id == user.org_id)
    if not include_inactive:
        stmt = stmt.where(Site.is_active.is_(True))
    rows = (await db.execute(stmt)).scalars().all()
    return [_site_to_dict(s) for s in rows]


# ── Writes ───────────────────────────────────────────────────────────────


async def create_site(
    db: AsyncSession,
    user: User,
    *,
    name: str,
    timezone: str = DEFAULT_TIMEZONE,
) -> dict:
    _require_write_role(user)
    if user.org_id is None:
        raise TaskStatsError("bad_request", "User has no organization")
    site = Site(
        org_id=user.org_id,
        name=name.strip()[:120],
        timezone=(timezone or DEFAULT_TIMEZONE).strip()[:64] or DEFAULT_TIMEZONE,
        is_active=True,
    )
    db.add(site)
    await db.flush()
    return _site_to_dict(site)


async def update_site(
    db: AsyncSession,
    user: User,
    site_id: uuid.UUID,
    *,
    name: str | None = None,
    timezone: str | None = None,
    is_active: bool | None = None,
) -> dict:
    _require_write_role(user)
    site = await _get_authorized_site(db, user, site_id)
    if name is not None:
        site.name = name.strip()[:120]
    if timezone is not None:
        site.timezone = timezone.strip()[:64] or DEFAULT_TIMEZONE
    if is_active is not None:
        site.is_active = is_active
    db.add(site)
    await db.flush()
    return _site_to_dict(site)


async def delete_site(db: AsyncSession, user: User, site_id: uuid.UUID) -> None:
    _require_write_role(user)
    site = await _get_authorized_site(db, user, site_id)
    # rooms.site_id is ON DELETE SET NULL, so deleting a site just drops the
    # link on its rooms (they fall back to the org-wide / unsited pool).
    await db.delete(site)
    await db.flush()
