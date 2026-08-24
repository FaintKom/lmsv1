"""A plain teacher sees the groups they lead — specs/061.

Measured in prod on 2026-08-24 from a teacher's own session: Игорь led no
group at all and still read every group of the school back, member counts
included. The endpoint scoped by org and stopped there; its docstring said so
out loud — "List all student groups in the org."

Sibling file ``test_groups_tenancy.py`` guards the boundary *between* schools.
This one guards the boundary inside one school, which is a different rule and
was not covered.

The isolation check opens with a positive control, because "somebody else's
group is missing from my list" also passes against a list that returns nothing.
"""

import uuid
from datetime import datetime, timezone

from app.admin.models import StudentGroup
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from tests.conftest import auth_header


async def _staff(db, org, name, *, methodist=False):
    u = User(
        org_id=org.id,
        email=f"teacher-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=name,
        role=UserRole.teacher,
        is_active=True,
        is_methodist=methodist,
        consent_accepted_at=datetime.now(timezone.utc),
    )
    db.add(u)
    await db.flush()
    return u


async def _group(db, org, name, teacher=None):
    g = StudentGroup(
        org_id=org.id,
        name=name,
        teacher_id=teacher.id if teacher else None,
    )
    db.add(g)
    await db.flush()
    return g


async def test_teacher_sees_their_group_and_not_the_others(client, org, db):
    mine = await _staff(db, org, "Mine")
    other = await _staff(db, org, "Other")

    await _group(db, org, "My Tuesday group", mine)
    await _group(db, org, "Their group", other)
    await _group(db, org, "Nobody's group")

    resp = await client.get("/api/v1/admin/groups", headers=auth_header(mine))
    assert resp.status_code == 200, resp.text
    names = [g["name"] for g in resp.json()]
    # Positive control first: the endpoint really does return groups.
    assert "My Tuesday group" in names
    assert "Their group" not in names
    assert "Nobody's group" not in names


async def test_methodist_still_sees_the_whole_school(client, org, db):
    other = await _staff(db, org, "Other")
    await _group(db, org, "Their group", other)
    await _group(db, org, "Nobody's group")

    methodist = await _staff(db, org, "Мария", methodist=True)

    resp = await client.get("/api/v1/admin/groups", headers=auth_header(methodist))
    assert resp.status_code == 200, resp.text
    names = [g["name"] for g in resp.json()]
    assert "Their group" in names
    assert "Nobody's group" in names
