"""Leading a group on a course makes the course yours to look at — specs/061.

The owner's rule of 2026-08-23 says a teacher sees their own: their groups'
students and their courses. The dashboard learned that first, and for a while
the rest of the product disagreed — it counted a group's students as the
teacher's own while the journal refused them the course those students study.

These tests pin both sides of the new boundary: a course I lead a group on is
mine to open; a course I have nothing to do with still is not.
"""

import uuid
from datetime import datetime, timezone

from app.admin.models import StudentGroup
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from tests.conftest import auth_header, make_course


async def _teacher(db, org, name):
    u = User(
        org_id=org.id,
        email=f"teacher-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=name,
        role=UserRole.teacher,
        is_active=True,
        consent_accepted_at=datetime.now(timezone.utc),
    )
    db.add(u)
    await db.flush()
    return u


async def test_a_course_i_lead_a_group_on_is_mine_to_open(client, org, db):
    owner = await _teacher(db, org, "Course Owner")
    course = await make_course(db, org, owner)

    leader = await _teacher(db, org, "Group Leader")
    db.add(
        StudentGroup(
            org_id=org.id,
            name="Wednesday group",
            teacher_id=leader.id,
            course_id=course.id,
        )
    )
    await db.flush()

    resp = await client.get(
        f"/api/v1/journal/sessions?course_id={course.id}", headers=auth_header(leader)
    )
    assert resp.status_code == 200, resp.text


async def test_a_course_i_have_nothing_to_do_with_is_still_closed(client, org, db):
    owner = await _teacher(db, org, "Course Owner")
    course = await make_course(db, org, owner)

    stranger = await _teacher(db, org, "Stranger")

    resp = await client.get(
        f"/api/v1/journal/sessions?course_id={course.id}", headers=auth_header(stranger)
    )
    assert resp.status_code == 403, resp.text
