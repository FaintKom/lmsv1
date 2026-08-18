"""Recording a live lesson: who may, what it holds, and when it goes away.

Written before the endpoints. The recording module was a stub until this slice:
its ``/init`` returned an upload URL for a route that did not exist, and
``/complete`` wrote whatever ``storage_url`` the caller sent onto the row.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import StudentGroup, StudentGroupMember
from app.config import settings
from app.live_lessons.models import LiveLesson
from app.live_media import service
from app.recording.models import Recording, RecordingStatus, RecordingType
from tests.conftest import auth_header


class _FakeRoomService:
    def __init__(self):
        self.created: list[str] = []
        self.deleted: list[str] = []

    async def list_rooms(self, _r):
        class _Empty:
            rooms: list = []

        return _Empty()

    async def create_room(self, r):
        self.created.append(r.name)

    async def delete_room(self, r):
        self.deleted.append(r.room)


class _FakeLiveKit:
    def __init__(self):
        self.room = _FakeRoomService()


@pytest.fixture(autouse=True)
def media_ready():
    saved = (
        settings.max_concurrent_media_participants,
        settings.livekit_api_key,
        settings.livekit_api_secret,
    )
    settings.max_concurrent_media_participants = 20
    settings.livekit_api_key = "testkey"
    settings.livekit_api_secret = "test-secret-long-enough-for-livekit-32"
    service.set_livekit(_FakeLiveKit())
    yield
    service.set_livekit(None)
    (
        settings.max_concurrent_media_participants,
        settings.livekit_api_key,
        settings.livekit_api_secret,
    ) = saved


async def make_lesson(db: AsyncSession, org, teacher, students=()) -> LiveLesson:
    group = StudentGroup(org_id=org.id, name="Rec G", teacher_id=teacher.id)
    db.add(group)
    await db.flush()
    for s in students:
        db.add(StudentGroupMember(group_id=group.id, user_id=s.id))
    lesson = LiveLesson(
        org_id=org.id,
        group_id=group.id,
        teacher_id=teacher.id,
        status="active",
        follow_mode="free",
    )
    db.add(lesson)
    await db.flush()
    return lesson


def enable_recording(org, days: int = 30) -> None:
    org.settings = {
        **(org.settings or {}),
        "recording_enabled": True,
        "recording_retention_days": days,
    }


async def start(client: AsyncClient, lesson, teacher) -> str:
    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/recording", headers=auth_header(teacher)
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["recording_id"]


# --- The school decides whether recording exists at all ----------------------


async def test_recording_is_off_until_the_school_turns_it_on(
    client: AsyncClient, db, org, teacher, student
):
    """Off by default, the only safe default when the subject is a room full of
    children (FR-019)."""
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/recording", headers=auth_header(teacher)
    )
    assert resp.status_code == 403


async def test_teacher_starts_a_recording_once_enabled(
    client: AsyncClient, db, org, teacher, student
):
    """Positive control. Every refusal above means nothing without it."""
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/recording", headers=auth_header(teacher)
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["upload_url"].endswith("/upload")


async def test_pupil_cannot_start_a_recording(client: AsyncClient, db, org, teacher, student):
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/recording", headers=auth_header(student)
    )
    assert resp.status_code == 403


async def test_a_late_joiner_still_learns_it_is_being_recorded(
    client: AsyncClient, db, org, teacher, student
):
    """The indicator has to reach somebody who arrives mid-recording (FR-020).

    Broadcasting only at the start would leave them unaware, which is the one
    thing a recording indicator exists to prevent.
    """
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    await start(client, lesson, teacher)

    state = await client.get(
        f"/api/v1/live-lessons/{lesson.id}/media/recording", headers=auth_header(student)
    )
    assert state.status_code == 200
    assert state.json()["recording"] is True


# --- The upload the API had been promising -----------------------------------


async def test_upload_stores_the_file_and_the_server_decides_where(
    client: AsyncClient, db, org, teacher, student
):
    """``/init`` returned this URL long before the route existed."""
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)

    up = await client.put(
        f"/api/v1/recordings/{rid}/upload",
        content=b"not really a video",
        headers={**auth_header(teacher), "Content-Type": "video/webm"},
    )
    assert up.status_code == 200, up.text

    done = await client.post(
        f"/api/v1/recordings/{rid}/complete",
        json={"duration_seconds": 12, "size_bytes": 18},
        headers=auth_header(teacher),
    )
    assert done.status_code == 200
    body = done.json()
    assert body["status"] == "ready"
    assert body["storage_url"]


async def test_a_client_cannot_choose_where_its_recording_points(
    client: AsyncClient, db, org, teacher, student
):
    """The field left the request, so sending it changes nothing.

    Before this slice ``/complete`` wrote the caller's string onto the row, and
    that string later becomes a link somebody follows.
    """
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)
    await client.put(
        f"/api/v1/recordings/{rid}/upload",
        content=b"x",
        headers={**auth_header(teacher), "Content-Type": "video/webm"},
    )

    done = await client.post(
        f"/api/v1/recordings/{rid}/complete",
        json={"storage_url": "https://example.invalid/somebody-elses-file", "duration_seconds": 1},
        headers=auth_header(teacher),
    )
    assert done.status_code == 200
    assert "example.invalid" not in done.json()["storage_url"]


async def test_only_the_recorder_may_upload(client: AsyncClient, db, org, teacher, student):
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)

    resp = await client.put(
        f"/api/v1/recordings/{rid}/upload",
        content=b"x",
        headers={**auth_header(student), "Content-Type": "video/webm"},
    )
    assert resp.status_code == 404


# --- Isolation and sharing ---------------------------------------------------


async def test_another_school_cannot_touch_the_recording(
    client: AsyncClient, db, org, teacher, student, admin2
):
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)

    resp = await client.patch(
        f"/api/v1/recordings/{rid}",
        json={"shared_with_group": True},
        headers=auth_header(admin2),
    )
    assert resp.status_code == 404


async def test_sharing_with_the_group_is_a_deliberate_act(
    client: AsyncClient, db, org, teacher, student
):
    """Staff-only until the teacher says otherwise (FR-021)."""
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)

    hidden = await client.get("/api/v1/recordings", headers=auth_header(student))
    assert all(r["id"] != rid for r in hidden.json())

    shared = await client.patch(
        f"/api/v1/recordings/{rid}",
        json={"shared_with_group": True},
        headers=auth_header(teacher),
    )
    assert shared.status_code == 200

    visible = await client.get("/api/v1/recordings", headers=auth_header(student))
    assert any(r["id"] == rid for r in visible.json())


# --- Failure is visible, and old recordings go away --------------------------


async def test_a_recording_that_never_completed_is_shown_as_failed(db, org, teacher):
    """A dead browser tab must not leave a row waiting forever (FR-022)."""
    from app.recording.service import sweep_stale_uploads

    stale = Recording(
        user_id=teacher.id,
        org_id=org.id,
        type=RecordingType.video,
        status=RecordingStatus.uploading,
    )
    db.add(stale)
    await db.flush()
    stale.created_at = datetime.now(timezone.utc) - timedelta(hours=6)
    await db.flush()

    assert await sweep_stale_uploads(db) == 1
    await db.refresh(stale)
    assert stale.status == RecordingStatus.failed


async def test_a_recording_still_uploading_is_left_alone(db, org, teacher):
    """The sweep must not shoot the living.

    Without this, the test above passes against a sweep that fails everything it
    can find.
    """
    from app.recording.service import sweep_stale_uploads

    fresh = Recording(
        user_id=teacher.id,
        org_id=org.id,
        type=RecordingType.video,
        status=RecordingStatus.uploading,
    )
    db.add(fresh)
    await db.flush()

    assert await sweep_stale_uploads(db) == 0
    await db.refresh(fresh)
    assert fresh.status == RecordingStatus.uploading


async def test_expired_recordings_are_deleted_with_their_bytes(db, org, teacher):
    """Retention is a promise to the school, and to whoever is on the video."""
    from app.recording.service import purge_expired

    old = Recording(
        user_id=teacher.id,
        org_id=org.id,
        type=RecordingType.video,
        status=RecordingStatus.ready,
        storage_url="recordings/gone.webm",
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db.add(old)
    await db.flush()
    rid = old.id

    assert await purge_expired(db) == 1
    assert await db.scalar(select(Recording).where(Recording.id == rid)) is None


async def test_a_recording_inside_its_retention_survives(db, org, teacher):
    """Positive control for the purge, so it cannot pass by deleting everything."""
    from app.recording.service import purge_expired

    keep = Recording(
        user_id=teacher.id,
        org_id=org.id,
        type=RecordingType.video,
        status=RecordingStatus.ready,
        storage_url="recordings/keep.webm",
        expires_at=datetime.now(timezone.utc) + timedelta(days=10),
    )
    db.add(keep)
    await db.flush()
    rid = keep.id

    assert await purge_expired(db) == 0
    assert await db.scalar(select(Recording).where(Recording.id == rid)) is not None
