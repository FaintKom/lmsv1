"""The calendar shows the lessons it promises (specs/054).

It offered "your schedule, deadlines and events" and delivered everything but
the schedule: a pupil saw the homework deadline and none of the classes it was
set in.
"""

from datetime import time

from app.schedule.models import ScheduleSlot
from tests.conftest import auth_header, make_course, make_enrollment

# 24 August 2026 is a Monday, so a day_of_week of 1 falls on Tuesday the 25th.
WINDOW = {"from": "2026-08-24T00:00:00", "to": "2026-08-30T23:59:59"}


async def _tuesday_slot(db, org, course):
    slot = ScheduleSlot(
        org_id=org.id,
        course_id=course.id,
        day_of_week=1,
        start_time=time(17, 0),
        end_time=time(18, 30),
        location="",
        note="",
        active=True,
    )
    db.add(slot)
    await db.flush()
    return slot


async def test_enrolled_student_sees_the_lesson(client, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    await make_enrollment(db, course.id, student.id)
    await _tuesday_slot(db, org, course)

    resp = await client.get("/api/v1/calendar/events", params=WINDOW, headers=auth_header(student))
    assert resp.status_code == 200, resp.text

    lessons = [e for e in resp.json() if e["source"] == "lesson"]
    assert len(lessons) == 1
    assert lessons[0]["start_time"].startswith("2026-08-25T17:00")


async def test_student_of_another_course_sees_nothing(client, student, teacher, org, db):
    """Isolation: the calendar reuses my_schedule, so an outsider stays out."""
    course = await make_course(db, org, teacher)
    await _tuesday_slot(db, org, course)  # student is NOT enrolled

    resp = await client.get("/api/v1/calendar/events", params=WINDOW, headers=auth_header(student))
    assert resp.status_code == 200, resp.text
    assert [e for e in resp.json() if e["source"] == "lesson"] == []


async def test_a_window_without_dates_adds_no_lessons(client, student, teacher, org, db):
    """No range means no expansion — the guard against an unbounded fan-out."""
    course = await make_course(db, org, teacher)
    await make_enrollment(db, course.id, student.id)
    await _tuesday_slot(db, org, course)

    resp = await client.get("/api/v1/calendar/events", headers=auth_header(student))
    assert resp.status_code == 200, resp.text
    assert [e for e in resp.json() if e["source"] == "lesson"] == []
