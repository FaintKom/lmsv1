"""Which school a newly created account lands in (specs/053).

A super admin who has just created a school needs to put its first
administrator there. The endpoint always honoured ``org_id`` from a super
admin — the form simply never sent it, so the account landed in whatever
school the super admin happened to be in, and the only way back was the
organization dropdown in the users table.
"""

from sqlalchemy import select

from app.auth.models import User
from tests.conftest import auth_header


async def test_super_admin_places_the_new_user_in_the_named_school(client, super_admin, org2, db):
    resp = await client.post(
        "/api/v1/admin/users",
        json={
            "full_name": "First Admin",
            "email": "first-admin@test.school",
            "password": "TestPass123!",
            "role": "admin",
            "org_id": str(org2.id),
        },
        headers=auth_header(super_admin),
    )
    assert resp.status_code == 200, resp.text

    created = (
        await db.execute(select(User).where(User.email == "first-admin@test.school"))
    ).scalar_one()
    assert created.org_id == org2.id


async def test_super_admin_without_org_id_uses_their_own_school(client, super_admin, db):
    resp = await client.post(
        "/api/v1/admin/users",
        json={
            "full_name": "Same School",
            "email": "same-school@test.school",
            "password": "TestPass123!",
            "role": "teacher",
        },
        headers=auth_header(super_admin),
    )
    assert resp.status_code == 200, resp.text

    created = (
        await db.execute(select(User).where(User.email == "same-school@test.school"))
    ).scalar_one()
    assert created.org_id == super_admin.org_id


async def test_plain_admin_cannot_place_a_user_in_another_school(client, admin, org2, db):
    """Isolation: the field is a super admin's tool, not everyone's."""
    resp = await client.post(
        "/api/v1/admin/users",
        json={
            "full_name": "Trespasser",
            "email": "trespasser@test.school",
            "password": "TestPass123!",
            "role": "student",
            "org_id": str(org2.id),
        },
        headers=auth_header(admin),
    )
    assert resp.status_code == 200, resp.text

    created = (
        await db.execute(select(User).where(User.email == "trespasser@test.school"))
    ).scalar_one()
    assert created.org_id == admin.org_id
