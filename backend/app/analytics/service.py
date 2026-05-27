"""Business logic for admin-dashboard persistence + RBAC.

RBAC matrix:
  - teacher    → view_scope = own_teacher; can only manage own rows.
  - admin      → view_scope = org;         can only manage own rows;
                 reads are org-scoped (cannot see other orgs).
  - super_admin → view_scope = global;     unrestricted.

is_default flips one row "on" per (user, view_scope) — flipping a new
default automatically clears the prior one in the same transaction so
the UI always lands on a single canonical dashboard.
"""
from __future__ import annotations

import uuid

from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.models import AdminDashboard, DashboardScope
from app.analytics.schemas import (
    DashboardCreateRequest,
    DashboardUpdateRequest,
)
from app.auth.models import User, UserRole


class DashboardError(Exception):
    """Domain error with a stable code + user-facing message."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


# ── RBAC helpers ──────────────────────────────────────────────────────


def _allowed_scopes(user: User) -> set[DashboardScope]:
    """Which view_scopes the user is allowed to create / pick."""
    if user.role == UserRole.super_admin:
        return {DashboardScope.global_, DashboardScope.org, DashboardScope.own_teacher}
    if user.role == UserRole.admin:
        return {DashboardScope.org, DashboardScope.own_teacher}
    if user.role == UserRole.teacher:
        return {DashboardScope.own_teacher}
    # student / parent
    return set()


def require_dashboard_role(user: User) -> None:
    """Reject roles that have no dashboard surface."""
    if user.role not in (UserRole.super_admin, UserRole.admin, UserRole.teacher):
        raise DashboardError("forbidden", "Role cannot manage dashboards")


def check_scope_allowed(user: User, scope: DashboardScope) -> None:
    if scope not in _allowed_scopes(user):
        raise DashboardError(
            "scope_not_allowed",
            f"Role {user.role.value} cannot use scope {scope.value}",
        )


def _can_read(user: User, row: AdminDashboard) -> bool:
    """Visibility check for a single row."""
    if user.role == UserRole.super_admin:
        return True
    if row.org_id != user.org_id:
        return False
    # admin/teacher can only see their own personal dashboards. Sharing
    # within an org is future work (view_scope=org + share flag).
    return row.user_id == user.id


def _can_write(user: User, row: AdminDashboard) -> bool:
    if user.role == UserRole.super_admin:
        return True
    if row.org_id != user.org_id:
        return False
    return row.user_id == user.id


# ── CRUD ──────────────────────────────────────────────────────────────


async def _clear_other_defaults(
    db: AsyncSession,
    user_id: uuid.UUID,
    scope: DashboardScope,
    keep_id: uuid.UUID | None,
) -> None:
    """Ensure at most one is_default=True per (user, scope)."""
    stmt = select(AdminDashboard).where(
        and_(
            AdminDashboard.user_id == user_id,
            AdminDashboard.view_scope == scope.value,
            AdminDashboard.is_default.is_(True),
        )
    )
    rows = (await db.execute(stmt)).scalars().all()
    for r in rows:
        if keep_id is None or r.id != keep_id:
            r.is_default = False


async def create_dashboard(
    db: AsyncSession,
    user: User,
    body: DashboardCreateRequest,
) -> AdminDashboard:
    require_dashboard_role(user)
    check_scope_allowed(user, body.view_scope)

    row = AdminDashboard(
        id=uuid.uuid4(),
        org_id=user.org_id,
        user_id=user.id,
        name=body.name,
        view_scope=body.view_scope.value,
        is_default=body.is_default,
        layout=body.layout,
        filters=body.filters,
    )
    db.add(row)
    if body.is_default:
        await db.flush()
        await _clear_other_defaults(db, user.id, body.view_scope, row.id)
    await db.flush()
    return row


async def list_dashboards(
    db: AsyncSession,
    user: User,
    *,
    scope: DashboardScope | None = None,
) -> list[AdminDashboard]:
    require_dashboard_role(user)

    stmt = select(AdminDashboard)
    if user.role == UserRole.super_admin:
        pass  # no scope cap
    else:
        # Personal-only view for now (no org-share feature).
        stmt = stmt.where(
            and_(
                AdminDashboard.org_id == user.org_id,
                AdminDashboard.user_id == user.id,
            )
        )
    if scope is not None:
        stmt = stmt.where(AdminDashboard.view_scope == scope.value)
    stmt = stmt.order_by(
        desc(AdminDashboard.is_default), desc(AdminDashboard.updated_at)
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_dashboard(
    db: AsyncSession, user: User, dashboard_id: uuid.UUID
) -> AdminDashboard:
    require_dashboard_role(user)
    row = await db.scalar(
        select(AdminDashboard).where(AdminDashboard.id == dashboard_id)
    )
    if row is None:
        raise DashboardError("not_found", "Dashboard not found")
    if not _can_read(user, row):
        # Hide existence — return 404 not 403 to avoid leaking org ids.
        raise DashboardError("not_found", "Dashboard not found")
    return row


async def update_dashboard(
    db: AsyncSession,
    user: User,
    dashboard_id: uuid.UUID,
    body: DashboardUpdateRequest,
) -> AdminDashboard:
    require_dashboard_role(user)
    row = await db.scalar(
        select(AdminDashboard).where(AdminDashboard.id == dashboard_id)
    )
    if row is None:
        raise DashboardError("not_found", "Dashboard not found")
    if not _can_write(user, row):
        raise DashboardError("forbidden", "Cannot edit this dashboard")

    if body.view_scope is not None:
        check_scope_allowed(user, body.view_scope)
        row.view_scope = body.view_scope.value
    if body.name is not None:
        row.name = body.name
    if body.layout is not None:
        row.layout = body.layout
    if body.filters is not None:
        row.filters = body.filters
    if body.is_default is not None:
        row.is_default = body.is_default
        if body.is_default:
            scope = DashboardScope(row.view_scope)
            await db.flush()
            await _clear_other_defaults(db, row.user_id, scope, row.id)

    await db.flush()
    return row


async def delete_dashboard(
    db: AsyncSession, user: User, dashboard_id: uuid.UUID
) -> None:
    require_dashboard_role(user)
    row = await db.scalar(
        select(AdminDashboard).where(AdminDashboard.id == dashboard_id)
    )
    if row is None:
        raise DashboardError("not_found", "Dashboard not found")
    if not _can_write(user, row):
        raise DashboardError("forbidden", "Cannot delete this dashboard")
    await db.delete(row)
    await db.flush()
