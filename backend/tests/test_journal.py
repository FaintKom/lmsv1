"""Class journal — per-day register on top of attendance.

Covers:
  - upsert + list: held/topic round-trip + attendance counts per day.
  - get_day activity: a student who completed a lesson + submitted an exercise
    on day X shows up for X; another day shows zero activity for that student.
  - RBAC: teacher cannot touch a colleague's course; student/parent forbidden.
  - org isolation: cross-org access is hidden as 404.
"""
import uuid
from datetime import date, datetime, time, timedelta, timezone

import pytest

from app.attendance.models import AttendanceRecord, AttendanceStatus
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from app.exercises.models import ExerciseSubmission
from app.journal.models import ClassSession
from app.progress.models import Enrollment, LessonProgress, LessonStatus  # noqa: F401
from app.schedule.models import ScheduleSlot
from tests.conftest import (
    auth_header,
    make_course,
    make_enrollment,
    make_exercise,
    make_lesson,
    make_module,
)

DAY = date(2026, 5, 20)  # a Wednesday (weekday() == 2)
OTHER_DAY = date(2026, 5, 21)  # a Thursday (weekday() == 3)


async def _make_slot(db, org, course, day_of_week, *, active=True, location="Room 5"):
    slot = ScheduleSlot(
        org_id=org.id,
        course_id=course.id,
        day_of_week=day_of_week,
        start_time=time(9, 0),
        end_time=time(10, 30),
        location=location,
        note="",
        active=active,
    )
    db.add(slot)
    await db.flush()
    return slot


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


# ── schedule → journal link ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_day_returns_scheduled_slots(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    # Active slot on DAY's weekday (Wed) + an inactive one on the same weekday.
    await _make_slot(db, org, course, DAY.weekday(), location="Room 5")
    await _make_slot(db, org, course, DAY.weekday(), active=False, location="Old")

    resp = await client.get(
        "/api/v1/journal/day",
        params={"course_id": str(course.id), "session_date": DAY.isoformat()},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    slots = resp.json()["scheduled_slots"]
    assert slots == [
        {"start_time": "09:00", "end_time": "10:30", "location": "Room 5"}
    ]

    # A non-matching weekday (Thu) returns no slots.
    resp = await client.get(
        "/api/v1/journal/day",
        params={"course_id": str(course.id), "session_date": OTHER_DAY.isoformat()},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["scheduled_slots"] == []


@pytest.mark.asyncio
async def test_generate_from_schedule_creates_and_skips(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    # Slots on Wed (2) and Fri (4).
    await _make_slot(db, org, course, 2)
    await _make_slot(db, org, course, 4)

    # Pre-existing session on one of the Wednesdays — must be left untouched.
    preexisting = ClassSession(
        org_id=org.id,
        course_id=course.id,
        session_date=date(2026, 5, 20),  # Wed
        held=False,
        topic="Already here",
        notes="keep me",
    )
    db.add(preexisting)
    await db.flush()

    # Range Mon 2026-05-18 .. Sun 2026-05-24 → Wed 20, Fri 22 scheduled.
    resp = await client.post(
        "/api/v1/journal/generate-from-schedule",
        json={
            "course_id": str(course.id),
            "from_date": "2026-05-18",
            "to_date": "2026-05-24",
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # Wed already had a row → skipped; only Fri 22 created.
    assert body["created"] == 1
    assert body["dates"] == ["2026-05-22"]

    # Pre-existing row is unchanged (topic/held preserved).
    rows = (
        await db.execute(
            ClassSession.__table__.select().where(
                ClassSession.course_id == course.id
            )
        )
    ).all()
    by_date = {r.session_date: r for r in rows}
    assert by_date[date(2026, 5, 20)].topic == "Already here"
    assert by_date[date(2026, 5, 20)].held is False
    assert by_date[date(2026, 5, 22)].held is True
    assert by_date[date(2026, 5, 22)].topic == ""
    # No row for unscheduled days (e.g. Mon 18).
    assert date(2026, 5, 18) not in by_date

    # Idempotent: a second run over the same range creates nothing.
    resp = await client.post(
        "/api/v1/journal/generate-from-schedule",
        json={
            "course_id": str(course.id),
            "from_date": "2026-05-18",
            "to_date": "2026-05-24",
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["created"] == 0


@pytest.mark.asyncio
async def test_generate_from_schedule_no_slots_is_noop(client, teacher, org, db):
    course = await make_course(db, org, teacher)  # no slots at all
    resp = await client.post(
        "/api/v1/journal/generate-from-schedule",
        json={
            "course_id": str(course.id),
            "from_date": "2026-05-18",
            "to_date": "2026-05-24",
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"created": 0, "dates": []}


@pytest.mark.asyncio
async def test_generate_from_schedule_span_cap(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    await _make_slot(db, org, course, 0)

    start = date(2026, 1, 1)
    # 93 days inclusive → over the 92-day cap.
    too_far = start + timedelta(days=92)
    resp = await client.post(
        "/api/v1/journal/generate-from-schedule",
        json={
            "course_id": str(course.id),
            "from_date": start.isoformat(),
            "to_date": too_far.isoformat(),
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 422, resp.text

    # Inverted range is also rejected.
    resp = await client.post(
        "/api/v1/journal/generate-from-schedule",
        json={
            "course_id": str(course.id),
            "from_date": "2026-05-24",
            "to_date": "2026-05-18",
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 422, resp.text


@pytest.mark.asyncio
async def test_generate_from_schedule_rbac(client, teacher, org, db):
    colleague = await _new_user(db, org, UserRole.teacher, suffix="colleague")
    course = await make_course(db, org, colleague)  # owned by colleague
    await _make_slot(db, org, course, 2)

    resp = await client.post(
        "/api/v1/journal/generate-from-schedule",
        json={
            "course_id": str(course.id),
            "from_date": "2026-05-18",
            "to_date": "2026-05-24",
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_generate_from_schedule_cross_org_hidden(client, teacher, org, org2, db):
    other_admin = await _new_user(db, org2, UserRole.admin, suffix="o2")
    course = await make_course(db, org, teacher)
    await _make_slot(db, org, course, 2)

    resp = await client.post(
        "/api/v1/journal/generate-from-schedule",
        json={
            "course_id": str(course.id),
            "from_date": "2026-05-18",
            "to_date": "2026-05-24",
        },
        headers=auth_header(other_admin),
    )
    assert resp.status_code == 404, resp.text
