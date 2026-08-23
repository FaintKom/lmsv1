"""Who is slipping, and whose journal day is empty — specs/061.

The scoping rule is the owner's: a teacher sees only their own. The isolation
check opens with a positive control, because "the other teacher's student is
absent from my list" passes trivially against an endpoint returning nothing.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from app.admin.models import StudentGroup, StudentGroupMember
from app.attendance.models import AttendanceRecord, AttendanceStatus
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from app.journal.models import ClassSession
from tests.conftest import auth_header, make_course

YESTERDAY = date.today() - timedelta(days=1)
EARLIER = date.today() - timedelta(days=3)


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


async def _group(db, org, teacher, student, course):
    g = StudentGroup(
        org_id=org.id,
        name=f"Group {uuid.uuid4().hex[:4]}",
        teacher_id=teacher.id,
        course_id=course.id,
    )
    db.add(g)
    await db.flush()
    db.add(StudentGroupMember(group_id=g.id, user_id=student.id))
    await db.flush()
    return g


async def _absences(db, org, student, course, days):
    for day in days:
        db.add(
            AttendanceRecord(
                org_id=org.id,
                student_id=student.id,
                course_id=course.id,
                session_date=day,
                status=AttendanceStatus.absent,
            )
        )
    await db.flush()


async def test_two_absences_put_a_student_on_the_list(client, org, db):
    teacher = await _user(db, org, UserRole.teacher, "Mine")
    student = await _user(db, org, UserRole.student, "Slipping Student")
    course = await make_course(db, org, teacher)
    await _group(db, org, teacher, student, course)
    await _absences(db, org, student, course, [YESTERDAY, EARLIER])

    resp = await client.get("/api/v1/journal/attention", headers=auth_header(teacher))
    assert resp.status_code == 200, resp.text
    listed = {s["id"]: s["missed"] for s in resp.json()["students"]}
    assert listed.get(str(student.id)) == 2


async def test_one_absence_is_life_not_a_pattern(client, org, db):
    teacher = await _user(db, org, UserRole.teacher, "Mine")
    student = await _user(db, org, UserRole.student, "Fine Student")
    course = await make_course(db, org, teacher)
    await _group(db, org, teacher, student, course)
    await _absences(db, org, student, course, [YESTERDAY])

    resp = await client.get("/api/v1/journal/attention", headers=auth_header(teacher))
    assert resp.status_code == 200, resp.text
    assert [s for s in resp.json()["students"] if s["id"] == str(student.id)] == []


async def test_another_teachers_student_stays_out_of_my_list(client, org, db):
    mine = await _user(db, org, UserRole.teacher, "Mine")
    my_student = await _user(db, org, UserRole.student, "My Student")
    my_course = await make_course(db, org, mine)
    await _group(db, org, mine, my_student, my_course)
    await _absences(db, org, my_student, my_course, [YESTERDAY, EARLIER])

    other = await _user(db, org, UserRole.teacher, "Other")
    their_student = await _user(db, org, UserRole.student, "Their Student")
    their_course = await make_course(db, org, other)
    await _group(db, org, other, their_student, their_course)
    await _absences(db, org, their_student, their_course, [YESTERDAY, EARLIER])

    resp = await client.get("/api/v1/journal/attention", headers=auth_header(mine))
    assert resp.status_code == 200, resp.text
    ids = [s["id"] for s in resp.json()["students"]]
    # Positive control first: the endpoint really does return people.
    assert str(my_student.id) in ids
    assert str(their_student.id) not in ids


async def test_a_held_day_with_no_attendance_is_unfinished_business(client, org, db):
    teacher = await _user(db, org, UserRole.teacher, "Mine")
    student = await _user(db, org, UserRole.student, "Student")
    course = await make_course(db, org, teacher)
    await _group(db, org, teacher, student, course)

    db.add(ClassSession(org_id=org.id, course_id=course.id, session_date=YESTERDAY, held=True))
    await db.flush()

    resp = await client.get("/api/v1/journal/attention", headers=auth_header(teacher))
    assert resp.status_code == 200, resp.text
    assert YESTERDAY.isoformat() in [u["session_date"] for u in resp.json()["unfilled"]]

    # Mark one student present and the day stops being unfinished.
    db.add(
        AttendanceRecord(
            org_id=org.id,
            student_id=student.id,
            course_id=course.id,
            session_date=YESTERDAY,
            status=AttendanceStatus.present,
        )
    )
    await db.flush()

    resp = await client.get("/api/v1/journal/attention", headers=auth_header(teacher))
    assert YESTERDAY.isoformat() not in [u["session_date"] for u in resp.json()["unfilled"]]
