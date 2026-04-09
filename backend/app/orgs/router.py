"""Multi-org membership endpoints (P2-11).

Supports users who belong to more than one organization — a common case
for teachers who work at multiple schools or methodists who serve
multiple client orgs. Membership is tracked in `organization_memberships`
with a per-org role. The user's "active" org is still `users.org_id`;
switching updates both `users.org_id` and `users.role` from the
selected membership so all existing org-scoped queries keep working.

Endpoints
---------
- GET  /me/memberships         — list orgs the current user belongs to
- POST /me/switch-org/{org_id} — set the active org (must be a member)
- GET  /admin/org-members      — list members of the current admin's org
- POST /admin/org-members      — add an existing user (by email) to the
                                 current admin's org with a given role
- DELETE /admin/org-members/{user_id} — remove a member from the org
                                         (the user itself is not deleted)
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import Organization, OrganizationMembership, User, UserRole
from app.db.session import get_db

router = APIRouter()


# ---------------------------------------------------------------------------
# User-facing endpoints
# ---------------------------------------------------------------------------


class MembershipOut(BaseModel):
    org_id: str
    org_name: str
    org_slug: str
    role: str
    is_active: bool


@router.get("/me/memberships")
async def my_memberships(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List every organization the current user belongs to."""
    q = (
        select(OrganizationMembership, Organization)
        .join(Organization, Organization.id == OrganizationMembership.org_id)
        .where(OrganizationMembership.user_id == user.id)
        .order_by(Organization.name.asc())
    )
    rows = (await db.execute(q)).all()
    return {
        "active_org_id": str(user.org_id),
        "memberships": [
            MembershipOut(
                org_id=str(org.id),
                org_name=org.name,
                org_slug=org.slug,
                role=mem.role.value if hasattr(mem.role, "value") else str(mem.role),
                is_active=bool(org.is_active),
            ).model_dump()
            for (mem, org) in rows
        ],
    }


@router.post("/me/switch-org/{org_id}")
async def switch_org(
    org_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Switch the authenticated user's active organization.

    The user must already be a member of the target org. The user's
    role is also updated from the membership so role-gated endpoints
    reflect the new org.
    """
    try:
        target_id = uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(400, "Invalid org_id") from None

    mem = (
        await db.execute(
            select(OrganizationMembership).where(
                and_(
                    OrganizationMembership.user_id == user.id,
                    OrganizationMembership.org_id == target_id,
                )
            )
        )
    ).scalar_one_or_none()
    if mem is None:
        raise HTTPException(403, "You are not a member of that organization")

    user.org_id = target_id
    user.role = mem.role
    db.add(user)
    await db.flush()
    return {
        "status": "ok",
        "active_org_id": str(target_id),
        "role": mem.role.value if hasattr(mem.role, "value") else str(mem.role),
    }


# ---------------------------------------------------------------------------
# Admin endpoints — manage members of the admin's active org
# ---------------------------------------------------------------------------


class AddMemberRequest(BaseModel):
    email: EmailStr
    role: str  # one of UserRole values


@router.get("/admin/org-members")
async def list_org_members(
    admin: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """List every user with a membership in the admin's active org."""
    q = (
        select(OrganizationMembership, User)
        .join(User, User.id == OrganizationMembership.user_id)
        .where(OrganizationMembership.org_id == admin.org_id)
        .order_by(User.full_name.asc())
    )
    rows = (await db.execute(q)).all()
    return {
        "org_id": str(admin.org_id),
        "members": [
            {
                "user_id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "role": (
                    mem.role.value if hasattr(mem.role, "value") else str(mem.role)
                ),
                "is_active": bool(u.is_active),
                "is_primary_org": u.org_id == admin.org_id,
            }
            for (mem, u) in rows
        ],
    }


@router.post("/admin/org-members")
async def add_org_member(
    data: AddMemberRequest,
    request: Request,
    admin: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """Add an existing user (looked up by email) to the admin's org.

    The user must already exist — this endpoint does not create
    accounts. Super admin role can only be granted by a super admin.
    """
    try:
        target_role = UserRole(data.role)
    except ValueError:
        raise HTTPException(400, f"Invalid role: {data.role}") from None
    if target_role == UserRole.super_admin and admin.role != UserRole.super_admin:
        raise HTTPException(403, "Only super_admin can grant super_admin")

    email = data.email.strip().lower()
    target = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()
    if target is None:
        raise HTTPException(
            404,
            "No user with that email exists. Ask them to register first.",
        )

    existing = (
        await db.execute(
            select(OrganizationMembership).where(
                and_(
                    OrganizationMembership.user_id == target.id,
                    OrganizationMembership.org_id == admin.org_id,
                )
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        # Update role if it changed.
        if existing.role != target_role:
            existing.role = target_role
            db.add(existing)
            await db.flush()
        return {"status": "updated", "user_id": str(target.id)}

    db.add(
        OrganizationMembership(
            user_id=target.id,
            org_id=admin.org_id,
            role=target_role,
        )
    )
    await db.flush()
    return {"status": "added", "user_id": str(target.id)}


@router.delete("/admin/org-members/{user_id}")
async def remove_org_member(
    user_id: str,
    admin: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """Remove a membership from the admin's org.

    The user row itself is not deleted. If the removed org was the
    user's active org, they are transferred to any remaining
    membership; if none remain, the operation is rejected so we never
    orphan a user without an org.
    """
    try:
        parsed = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(400, "Invalid user_id") from None

    if parsed == admin.id:
        raise HTTPException(400, "You cannot remove yourself from the org")

    mem = (
        await db.execute(
            select(OrganizationMembership).where(
                and_(
                    OrganizationMembership.user_id == parsed,
                    OrganizationMembership.org_id == admin.org_id,
                )
            )
        )
    ).scalar_one_or_none()
    if mem is None:
        raise HTTPException(404, "User is not a member of this org")

    target_user = (
        await db.execute(select(User).where(User.id == parsed))
    ).scalar_one_or_none()
    if target_user is None:
        raise HTTPException(404, "User not found")

    # If this org is the user's active org, move them to another
    # membership or refuse if none exists.
    if target_user.org_id == admin.org_id:
        fallback = (
            await db.execute(
                select(OrganizationMembership).where(
                    and_(
                        OrganizationMembership.user_id == parsed,
                        OrganizationMembership.org_id != admin.org_id,
                    )
                )
            )
        ).scalars().first()
        if fallback is None:
            raise HTTPException(
                400,
                "User has no other org memberships. Deactivate the user "
                "instead of removing them.",
            )
        target_user.org_id = fallback.org_id
        target_user.role = fallback.role
        db.add(target_user)

    await db.delete(mem)
    await db.flush()
    return {"status": "removed", "user_id": str(parsed)}
