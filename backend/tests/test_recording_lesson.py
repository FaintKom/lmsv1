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
        self.updated: list[str] = []

    async def list_rooms(self, _r):
        class _Empty:
            rooms: list = []

        return _Empty()

    async def create_room(self, r):
        self.created.append(r.name)

    async def delete_room(self, r):
        self.deleted.append(r.room)

    async def update_participant(self, r):
        # Thin on purpose: this file is about recording. Whether the media
        # server is told correctly is asserted in test_live_media.py, against a
        # fake that models presence.
        self.updated.append(r.identity)


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
    assert body["download_url"] == f"/api/v1/recordings/{rid}/file"


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
    assert "example.invalid" not in (done.json()["download_url"] or "")


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


# --- The host has a disk, and the browser does not know how big it is --------


async def test_an_oversized_recording_is_refused_before_the_host_holds_it(
    client: AsyncClient, db, org, teacher, student
):
    """The cap is the point: a 40 GB disk shared with Postgres does not get to
    find out how long somebody's lesson was."""
    from app.recording import service as rec_service

    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)

    saved = settings.max_recording_upload_mb
    settings.max_recording_upload_mb = 1
    try:
        assert rec_service.max_upload_bytes() == 1024 * 1024
        resp = await client.put(
            f"/api/v1/recordings/{rid}/upload",
            content=b"x" * (1024 * 1024 + 512),
            headers={**auth_header(teacher), "Content-Type": "video/webm"},
        )
    finally:
        settings.max_recording_upload_mb = saved

    assert resp.status_code == 413, resp.text


async def test_a_recording_inside_the_cap_is_taken(client: AsyncClient, db, org, teacher, student):
    """Positive control. The refusal above proves nothing if the endpoint
    refuses everything — and the same payload passes once the cap allows it."""
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)

    resp = await client.put(
        f"/api/v1/recordings/{rid}/upload",
        content=b"x" * (1024 * 1024 + 512),
        headers={**auth_header(teacher), "Content-Type": "video/webm"},
    )
    assert resp.status_code == 200, resp.text


async def test_a_full_disk_refuses_the_upload_rather_than_filling_up(
    client: AsyncClient, db, org, teacher, student
):
    """Postgres shares this disk. A lesson recording is worth less than the
    school being able to log in tomorrow."""
    from app.recording import service as rec_service

    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)

    saved = rec_service.DISK_HEADROOM_BYTES
    rec_service.DISK_HEADROOM_BYTES = 1 << 62  # more free space than any disk has
    try:
        resp = await client.put(
            f"/api/v1/recordings/{rid}/upload",
            content=b"still a video, honest",
            headers={**auth_header(teacher), "Content-Type": "video/webm"},
        )
    finally:
        rec_service.DISK_HEADROOM_BYTES = saved

    assert resp.status_code == 507, resp.text


async def test_the_disk_guard_says_yes_when_there_is_room(tmp_path):
    """Positive control for the guard, so it cannot pass by refusing always."""
    from app.recording import service as rec_service

    saved = settings.upload_dir
    settings.upload_dir = str(tmp_path)
    try:
        assert rec_service.room_for(1024) is True
    finally:
        settings.upload_dir = saved


# --- A recording nobody can watch is not a recording -------------------------


async def upload(client: AsyncClient, rid: str, who, body: bytes = b"pretend webm") -> None:
    resp = await client.put(
        f"/api/v1/recordings/{rid}/upload",
        content=body,
        headers={**auth_header(who), "Content-Type": "video/webm"},
    )
    assert resp.status_code == 200, resp.text


async def test_the_teacher_can_watch_what_they_recorded(
    client: AsyncClient, db, org, teacher, student
):
    """Positive control for everything below: the file comes back."""
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)
    await upload(client, rid, teacher, b"pretend webm bytes")

    resp = await client.get(f"/api/v1/recordings/{rid}/file", headers=auth_header(teacher))
    assert resp.status_code == 200, resp.text
    assert resp.content == b"pretend webm bytes"


async def test_a_pupil_cannot_watch_a_recording_that_was_not_shared(
    client: AsyncClient, db, org, teacher, student
):
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)
    await upload(client, rid, teacher)

    resp = await client.get(f"/api/v1/recordings/{rid}/file", headers=auth_header(student))
    assert resp.status_code == 404

    shared = await client.patch(
        f"/api/v1/recordings/{rid}",
        json={"shared_with_group": True},
        headers=auth_header(teacher),
    )
    assert shared.status_code == 200

    # Same pupil, same file, one deliberate act in between.
    allowed = await client.get(f"/api/v1/recordings/{rid}/file", headers=auth_header(student))
    assert allowed.status_code == 200


async def test_another_school_cannot_watch_it_even_once_shared(
    client: AsyncClient, db, org, teacher, student, admin2
):
    """Sharing is with a class, not with the internet (Constitution I)."""
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)
    await upload(client, rid, teacher)
    await client.patch(
        f"/api/v1/recordings/{rid}",
        json={"shared_with_group": True},
        headers=auth_header(teacher),
    )

    resp = await client.get(f"/api/v1/recordings/{rid}/file", headers=auth_header(admin2))
    assert resp.status_code == 404


async def test_a_recording_with_no_file_yet_is_absent_rather_than_broken(
    client: AsyncClient, db, org, teacher, student
):
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])
    rid = await start(client, lesson, teacher)

    resp = await client.get(f"/api/v1/recordings/{rid}/file", headers=auth_header(teacher))
    assert resp.status_code == 404

    listed = await client.get("/api/v1/recordings", headers=auth_header(teacher))
    row = next(r for r in listed.json() if r["id"] == rid)
    assert row["download_url"] is None


async def test_a_pupil_handed_the_screen_is_still_not_offered_recording(
    client: AsyncClient, db, org, teacher, student
):
    """Two permissions, not one.

    The interface used to read "may record" off "may share the screen", which
    is the same person right up until a teacher hands a pupil the screen — and
    then offers them a button the server refuses.
    """
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])

    granted = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/participants/{student.id}/screen-share",
        json={"allowed": True},
        headers=auth_header(teacher),
    )
    assert granted.status_code == 200, granted.text

    grant = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/token", headers=auth_header(student)
    )
    assert grant.status_code == 200, grant.text
    body = grant.json()
    assert body["can_publish_screen"] is True  # positive control: the grant did widen
    assert body["can_record"] is False

    refused = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/recording", headers=auth_header(student)
    )
    assert refused.status_code == 403


async def test_the_teacher_is_offered_recording(client: AsyncClient, db, org, teacher, student):
    """Positive control for the flag itself."""
    enable_recording(org)
    await db.flush()
    lesson = await make_lesson(db, org, teacher, [student])

    grant = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/token", headers=auth_header(teacher)
    )
    assert grant.json()["can_record"] is True
