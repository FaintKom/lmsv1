"""Class journal — per-day register on top of attendance.

Covers:
  - upsert + list: held/topic round-trip + attendance counts per day.
  - get_day activity: a student who completed a lesson + submitted an exercise
    on day X shows up for X; another day shows zero activity for that student.
  - RBAC: teacher cannot touch a colleague's course; student/parent forbidden.
  - org isolation: cross-org access is hidden as 404.
"""
import uuid
from datetime import date, datetime, time, timezone

import pytest

from app.attendance.models import AttendanceRecord, AttendanceStatus
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from app.exercises.models import ExerciseSubmission
from app.progress.models import Enrollment, LessonProgress, LessonStatus  # noqa: F401
from tests.conftest import (
    auth_header,
    make_course,
    make_enrollment,
    make_exercise,
    make_lesson,
    make_module,
)

DAY = date(2026, 5, 20)
OTHER_DAY = date(2026, 5, 21)


def _utc(d: date) -> datetime:
    """Noon UTC on a calendar day — safely inside that day's UTC range."""
    return datetime.combine(d, time(12, 0), tzinfo=timezone.utc)


async def _new_user(db, org, role, *, is_methodist=False, suffix=""):
    u = User(
        org_id=org.id,
        email=f"{role.value}{suffix}-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=f"Test {role.value}{suffix}",
        role=role,
        is_active=True,
        is_methodist=is_methodist,
        consent_accepted_at=datetime.now(timezone.utc),
        privacy_policy_version="1.0",
    )
    db.add(u)
    await db.flush()
    return u


# ── upsert + list ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upsert_and_list_with_attendance_counts(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    s1 = await _new_user(db, org, UserRole.student, suffix="a")
    s2 = await _new_user(db, org, UserRole.student, suffix="b")
    await make_enrollment(db, course.id, s1.id)
    await make_enrollment(db, course.id, s2.id)

    # Attendance for the day: one present, one absent.
    db.add(AttendanceRecord(
        org_id=org.id, student_id=s1.id, course_id=course.id,
        session_date=DAY, status=AttendanceStatus.present,
    ))
    db.add(AttendanceRecord(
        org_id=org.id, student_id=s2.id, course_id=course.id,
        session_date=DAY, status=AttendanceStatus.absent,
    ))
    await db.flush()

    # Upsert the session.
    resp = await client.post(
        "/api/v1/journal/sessions",
        json={
            "course_id": str(course.id),
            "session_date": DAY.isoformat(),
            "held": True,
            "topic": "Intro to recursion",
            "notes": "Covered base cases.",
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["held"] is True
    assert body["topic"] == "Intro to recursion"

    # Update in place (same course+date) — topic + held change, no dup row.
    resp = await client.post(
        "/api/v1/journal/sessions",
        json={
            "course_id": str(course.id),
            "session_date": DAY.isoformat(),
            "held": False,
            "topic": "Cancelled — snow day",
            "notes": None,
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text

    # List shows exactly one row with the updated values + attendance counts.
    resp = await client.get(
        "/api/v1/journal/sessions",
        params={"course_id": str(course.id)},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data["sessions"]) == 1
    row = data["sessions"][0]
    assert row["held"] is False
    assert row["topic"] == "Cancelled — snow day"
    assert row["attendance"]["present"] == 1
    assert row["attendance"]["absent"] == 1
    assert row["attendance"]["total"] == 2


# ── get_day activity ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_day_activity(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id, title="Lesson One")
    exercise = await make_exercise(db, lesson.id, org.id)

    s1 = await _new_user(db, org, UserRole.student, suffix="active")
    s2 = await _new_user(db, org, UserRole.student, suffix="idle")
    e1 = await make_enrollment(db, course.id, s1.id)
    await make_enrollment(db, course.id, s2.id)

    # s1 completes the lesson + submits an exercise ON `DAY`.
    db.add(LessonProgress(
        enrollment_id=e1.id,
        lesson_id=lesson.id,
        status=LessonStatus.completed,
        completed_at=_utc(DAY),
    ))
    db.add(ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=s1.id,
        passed=True,
        submitted_at=_utc(DAY),
    ))
    await db.flush()

    resp = await client.get(
        "/api/v1/journal/day",
        params={"course_id": str(course.id), "session_date": DAY.isoformat()},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["session"] is None  # no session row created yet
    by_id = {a["student_id"]: a for a in data["activity"]}
    assert str(s1.id) in by_id
    assert str(s2.id) in by_id

    a1 = by_id[str(s1.id)]
    assert a1["lessons_completed"] == ["Lesson One"]
    assert a1["exercises_done"] == 1
    assert a1["quizzes_done"] == 0
    assert a1["assignments_done"] == 0

    a2 = by_id[str(s2.id)]
    assert a2["lessons_completed"] == []
    assert a2["exercises_done"] == 0

    # A different day shows no activity for s1.
    resp = await client.get(
        "/api/v1/journal/day",
        params={"course_id": str(course.id), "session_date": OTHER_DAY.isoformat()},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    other = {a["student_id"]: a for a in resp.json()["activity"]}
    assert other[str(s1.id)]["lessons_completed"] == []
    assert other[str(s1.id)]["exercises_done"] == 0


# ── RBAC ───────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_teacher_cannot_touch_colleagues_course(client, teacher, org, db):
    colleague = await _new_user(db, org, UserRole.teacher, suffix="colleague")
    course = await make_course(db, org, colleague)  # owned by colleague

    resp = await client.post(
        "/api/v1/journal/sessions",
        json={
            "course_id": str(course.id),
            "session_date": DAY.isoformat(),
            "held": True,
            "topic": "Sneaky edit",
            "notes": None,
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 403, resp.text

    resp = await client.get(
        "/api/v1/journal/day",
        params={"course_id": str(course.id), "session_date": DAY.isoformat()},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_methodist_sees_org_course(client, teacher, org, db):
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True, suffix="m")
    course = await make_course(db, org, teacher)  # owned by another teacher

    resp = await client.get(
        "/api/v1/journal/sessions",
        params={"course_id": str(course.id)},
        headers=auth_header(methodist),
    )
    assert resp.status_code == 200, resp.text


@pytest.mark.asyncio
async def test_student_and_parent_forbidden(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    student = await _new_user(db, org, UserRole.student)
    parent = await _new_user(db, org, UserRole.parent)

    for user in (student, parent):
        resp = await client.get(
            "/api/v1/journal/sessions",
            params={"course_id": str(course.id)},
            headers=auth_header(user),
        )
        # require_role(admin, teacher) rejects student/parent at the dependency.
        assert resp.status_code in (401, 403), resp.text


# ── org isolation ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_cross_org_hidden_as_404(client, teacher, org, org2, db):
    # admin in a different org cannot see this org's course (hidden as 404).
    other_admin = await _new_user(db, org2, UserRole.admin, suffix="o2")
    course = await make_course(db, org, teacher)

    resp = await client.get(
        "/api/v1/journal/sessions",
        params={"course_id": str(course.id)},
        headers=auth_header(other_admin),
    )
    assert resp.status_code == 404, resp.text
