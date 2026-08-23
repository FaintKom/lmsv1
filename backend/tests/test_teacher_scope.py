"""A teacher sees only their own — specs/061.

"Own" means the students of a group they lead and of a course they own. The
last test would fail against the old code, and it is the one that matters: a
teacher leading a group on somebody else's course used to own nothing at all,
and every dashboard card read zero.

The isolation check opens with a positive control. "The other teacher's student
is absent" is green before the endpoint exists.
"""

import uuid
from datetime import datetime, timezone

from app.admin.models import StudentGroup, StudentGroupMember
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from tests.conftest import auth_header, make_course


async def _user(db, org, role, name):
    u = User(
        org_id=org.id,
        email=f"{role.value}-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=name,
        role=role,
        is_active=True,
        consent_accepted_at=datetime.now(timezone.utc),
    )
    db.add(u)
    await db.flush()
    return u


async def _group_with(db, org, teacher, student, course=None):
    group = StudentGroup(
        org_id=org.id,
        name=f"Group {uuid.uuid4().hex[:4]}",
        teacher_id=teacher.id,
        course_id=course.id if course else None,
    )
    db.add(group)
    await db.flush()
    db.add(StudentGroupMember(group_id=group.id, user_id=student.id))
    await db.flush()
    return group


async def test_teacher_sees_the_student_of_their_group(client, org, db):
    teacher = await _user(db, org, UserRole.teacher, "Mine")
    student = await _user(db, org, UserRole.student, "My Student")
    await _group_with(db, org, teacher, student)

    resp = await client.get("/api/v1/journal/students", headers=auth_header(teacher))
    assert resp.status_code == 200, resp.text
    assert str(student.id) in [s["id"] for s in resp.json()]


async def test_teacher_does_not_see_another_teachers_student(client, org, db):
    mine = await _user(db, org, UserRole.teacher, "Mine")
    my_student = await _user(db, org, UserRole.student, "My Student")
    await _group_with(db, org, mine, my_student)

    other = await _user(db, org, UserRole.teacher, "Other")
    their_student = await _user(db, org, UserRole.student, "Their Student")
    await _group_with(db, org, other, their_student)

    resp = await client.get("/api/v1/journal/students", headers=auth_header(mine))
    assert resp.status_code == 200, resp.text
    ids = [s["id"] for s in resp.json()]
    # Positive control first: the endpoint really does return people.
    assert str(my_student.id) in ids
    assert str(their_student.id) not in ids


async def test_group_on_somebody_elses_course_still_counts_as_mine(client, org, db):
    """The Н-10 bug: leading a group is owning a course, for dashboard purposes."""
    owner = await _user(db, org, UserRole.teacher, "Course Owner")
    course = await make_course(db, org, owner)

    leader = await _user(db, org, UserRole.teacher, "Group Leader")
    student = await _user(db, org, UserRole.student, "Student")
    await _group_with(db, org, leader, student, course=course)

    resp = await client.get("/api/v1/admin/teacher-stats", headers=auth_header(leader))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["my_courses"] == 1
    assert body["my_students"] == 1
