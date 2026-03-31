"""Tests for calendar, meetings, notifications, discussions."""
import pytest
from httpx import AsyncClient

from tests.conftest import (
    auth_header,
    make_course,
    make_lesson,
    make_module,
)


# ─── Calendar ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_event(client: AsyncClient, teacher):
    """Only admin/teacher can create calendar events."""
    resp = await client.post("/api/v1/calendar/events", json={
        "title": "Study Session",
        "description": "Review math",
        "start_time": "2030-06-15T10:00:00Z",
        "end_time": "2030-06-15T12:00:00Z",
        "is_all_day": False,
    }, headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_student_cannot_create_event(client: AsyncClient, student):
    resp = await client.post("/api/v1/calendar/events", json={
        "title": "Nope",
        "start_time": "2030-06-15T10:00:00Z",
        "end_time": "2030-06-15T12:00:00Z",
    }, headers=auth_header(student))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_events(client: AsyncClient, student):
    resp = await client.get("/api/v1/calendar/events", headers=auth_header(student))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_upcoming_events(client: AsyncClient, student):
    resp = await client.get("/api/v1/calendar/upcoming", headers=auth_header(student))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_unauthenticated_calendar(client: AsyncClient):
    resp = await client.get("/api/v1/calendar/events")
    assert resp.status_code in (401, 403)


# ─── Meetings ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_meeting(client: AsyncClient, teacher):
    resp = await client.post("/api/v1/meetings", json={
        "title": "Office Hours",
        "description": "Weekly Q&A",
        "start_time": "2030-06-15T14:00:00Z",
        "end_time": "2030-06-15T15:00:00Z",
        "meeting_url": "https://meet.example.com/abc",
        "max_participants": 30,
    }, headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_meetings(client: AsyncClient, teacher):
    resp = await client.get("/api/v1/meetings", headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_active_meetings(client: AsyncClient, student):
    resp = await client.get("/api/v1/meetings/active", headers=auth_header(student))
    assert resp.status_code == 200


# ─── Notifications ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_notifications(client: AsyncClient, student):
    resp = await client.get("/api/v1/notifications", headers=auth_header(student))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_mark_all_read(client: AsyncClient, student):
    resp = await client.put("/api/v1/notifications/read-all", headers=auth_header(student))
    assert resp.status_code == 200


# ─── Discussions ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_post_comment(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post(
        f"/api/v1/discussions/lessons/{lesson.id}/comments",
        json={"body": "Great lesson!"},
        headers=auth_header(student),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_comments(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.get(
        f"/api/v1/discussions/lessons/{lesson.id}/comments",
        headers=auth_header(student),
    )
    assert resp.status_code == 200
