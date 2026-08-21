"""Jitsi is gone, and the things that merely sound like it are not.

The `meetings` module was video rooms — a separate feature from the live
lessons it sat beside in the menu. Removing it is easy to do too
enthusiastically: three unrelated parts of the product use the word "meeting"
for their own purposes, and taking any of them out breaks the journal or the
timetable rather than Jitsi.
"""

from datetime import datetime, timezone

from httpx import AsyncClient

from tests.conftest import auth_header


async def test_meetings_endpoint_is_gone(client: AsyncClient, teacher):
    """The router is unmounted, so the path is simply not there any more."""
    resp = await client.get("/api/v1/meetings/", headers=auth_header(teacher))
    assert resp.status_code == 404


async def test_creating_a_meeting_is_gone_too(client: AsyncClient, teacher):
    resp = await client.post(
        "/api/v1/meetings/",
        json={"title": "Should not exist", "duration_minutes": 30},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 404


async def test_calendar_still_takes_a_meeting_event(client: AsyncClient, teacher):
    """`EventType.meeting` is a calendar event type, nothing to do with Jitsi.

    A school marking a parents' evening in the calendar must keep working.
    """
    resp = await client.post(
        "/api/v1/calendar/events",
        json={
            "title": "Parents evening",
            "event_type": "meeting",
            "start_time": datetime(2026, 3, 2, 18, 0, tzinfo=timezone.utc).isoformat(),
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["event_type"] == "meeting"


async def test_a_room_still_keeps_its_video_link(client: AsyncClient, admin):
    """`rooms.meeting_url` is how a school points a classroom at any video room.

    The journal reads it and the timetable hands it to pupils. It shares a word
    with Jitsi and nothing else.
    """
    created = await client.post(
        "/api/v1/rooms",
        json={
            "name": "Room 7",
            "kind": "online",
            "meeting_url": "https://meet.example/room-7",
        },
        headers=auth_header(admin),
    )
    assert created.status_code == 201, created.text
    assert created.json()["meeting_url"] == "https://meet.example/room-7"
