import asyncio
import json
import uuid

from httpx import AsyncClient

from app.live_lessons import realtime
from tests.conftest import auth_header
from tests.test_live_lessons import make_group


async def test_sse_delivers_scene_event_with_role_filter(
    client: AsyncClient, db, org, teacher, student
):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]

    received: list[str] = []

    # httpx ASGITransport buffers the body until the app completes, so the
    # stream must terminate: we close it by publishing lesson_ended.
    async def listen():
        async with client.stream(
            "GET",
            f"/api/v1/live-lessons/{lesson_id}/events",
            headers=auth_header(student),
        ) as resp:
            assert resp.status_code == 200
            assert resp.headers["content-type"].startswith("text/event-stream")
            async for line in resp.aiter_lines():
                received.append(line)

    task = asyncio.create_task(listen())
    await asyncio.sleep(0.2)  # let the stream subscribe
    await realtime.publish(uuid.UUID(lesson_id), "all", "scene_changed", {"type": "board"})
    # teacher-only event must NOT reach the student stream
    await realtime.publish(uuid.UUID(lesson_id), "teacher", "signal", {"student_id": "x"})
    await realtime.publish(uuid.UUID(lesson_id), "all", "lesson_ended", {})
    await asyncio.wait_for(task, timeout=5)

    event_lines = [ln for ln in received if ln.startswith("event:")]
    assert event_lines[0] == "event: scene_changed"
    assert "event: signal" not in event_lines  # audience filter
    assert "event: lesson_ended" in event_lines
    data_lines = [ln for ln in received if ln.startswith("data:")]
    assert json.loads(data_lines[0][5:]) == {"type": "board"}


async def test_sse_stream_survives_ping_timeout(
    client: AsyncClient, db, org, teacher, student, monkeypatch
):
    """Regression: asyncio.wait_for used to cancel anext() on ping timeout,
    finalizing the subscription generator — the stream died right after the
    first ping (prod: every SSE connection closed at ~15s)."""
    from app.live_lessons import router as ll_router

    monkeypatch.setattr(ll_router, "SSE_PING_SECONDS", 0.05)

    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]

    received: list[str] = []

    async def listen():
        async with client.stream(
            "GET",
            f"/api/v1/live-lessons/{lesson_id}/events",
            headers=auth_header(student),
        ) as resp:
            assert resp.status_code == 200
            async for line in resp.aiter_lines():
                received.append(line)

    task = asyncio.create_task(listen())
    await asyncio.sleep(0.3)  # subscribe + at least one ping elapses
    # events published AFTER a ping must still arrive
    await realtime.publish(uuid.UUID(lesson_id), "all", "scene_changed", {"type": "board"})
    await asyncio.sleep(0.2)  # another ping between the two events
    await realtime.publish(uuid.UUID(lesson_id), "all", "lesson_ended", {})
    await asyncio.wait_for(task, timeout=5)

    assert any(ln.startswith(": ping") for ln in received)
    event_lines = [ln for ln in received if ln.startswith("event:")]
    assert "event: scene_changed" in event_lines
    assert "event: lesson_ended" in event_lines


async def test_sse_forbidden_for_outsider(client, db, org, teacher, student, admin2):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    # admin2 belongs to org2 -> 404 (org isolation)
    async with client.stream(
        "GET", f"/api/v1/live-lessons/{lesson_id}/events", headers=auth_header(admin2)
    ) as resp:
        assert resp.status_code == 404
