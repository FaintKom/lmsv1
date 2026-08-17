"""Guards on the media a live lesson carries.

Every test here was written before the code it describes and watched failing.
The isolation cases open with a positive control on purpose: "another school
gets 404" is green against an endpoint that does not exist yet, so on its own it
proves nothing.

Nothing here reaches a real media server. The participant count comes from a
fake injected through ``service.set_livekit``, mirroring how the live-lesson
tests inject fakeredis.
"""

import base64
import json
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import StudentGroup, StudentGroupMember
from app.auth.models import User, UserRole
from app.config import settings
from app.live_lessons.models import LiveLesson
from app.live_media import service
from tests.conftest import auth_header


class _FakeRoom:
    def __init__(self, num_participants: int):
        self.num_participants = num_participants


class _FakeRooms:
    def __init__(self, rooms):
        self.rooms = rooms


class _FakeRoomService:
    def __init__(self, participants: int = 0):
        self.participants = participants
        self.deleted: list[str] = []
        self.created: list[str] = []

    async def list_rooms(self, _request):
        return _FakeRooms([_FakeRoom(self.participants)] if self.participants else [])

    async def create_room(self, request):
        self.created.append(request.name)

    async def delete_room(self, request):
        self.deleted.append(request.room)


class _FakeLiveKit:
    def __init__(self, participants: int = 0):
        self.room = _FakeRoomService(participants)


@pytest.fixture(autouse=True)
def media_enabled():
    """Media ships switched off; these tests are about the guards, not that default.

    The ceiling is raised for them and restored afterwards. Two tests lower it
    again on purpose, because "off" is itself a behaviour worth asserting.
    """
    saved = (
        settings.max_concurrent_media_participants,
        settings.livekit_api_key,
        settings.livekit_api_secret,
    )
    settings.max_concurrent_media_participants = 20
    settings.livekit_api_key = "testkey"
    settings.livekit_api_secret = "test-secret-long-enough-for-livekit-32"
    yield
    (
        settings.max_concurrent_media_participants,
        settings.livekit_api_key,
        settings.livekit_api_secret,
    ) = saved


@pytest.fixture(autouse=True)
def fake_livekit():
    fake = _FakeLiveKit()
    service.set_livekit(fake)
    yield fake
    service.set_livekit(None)


async def make_lesson(db: AsyncSession, org, teacher, students=()) -> LiveLesson:
    group = StudentGroup(org_id=org.id, name="Media G", teacher_id=teacher.id)
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


def claims(token: str) -> dict:
    """Read a JWT's payload without verifying it.

    What matters here is what the server put in the token. Whether the signature
    is valid is the media server's job, and a test that re-implemented that
    check would only be testing the library.
    """
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))


def token_url(lesson: LiveLesson) -> str:
    return f"/api/v1/live-lessons/{lesson.id}/media/token"


# --- Positive controls -------------------------------------------------------


async def test_teacher_of_the_lesson_gets_a_grant(client: AsyncClient, db, org, teacher, student):
    """Positive control. Every 404 below is meaningless without this passing."""
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(token_url(lesson), headers=auth_header(teacher))
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["room"] == f"lesson-{lesson.id}"
    assert body["identity"] == str(teacher.id)
    assert claims(body["token"])["video"]["roomAdmin"] is True


async def test_pupil_of_the_group_gets_a_grant(client: AsyncClient, db, org, teacher, student):
    """Positive control for the pupil path."""
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(token_url(lesson), headers=auth_header(student))
    assert resp.status_code == 200, resp.text


async def test_issuing_a_grant_creates_the_room(
    client: AsyncClient, db, org, teacher, student, fake_livekit
):
    """A grant into a room nobody created is a grant into nothing.

    ``auto_create`` is off on the media server, so that holding a valid token
    cannot be turned into inventing a room. That makes creating it somebody's
    job, and this endpoint is the only place that has already decided the caller
    belongs there.

    Production found this before any test did: the token was right, the proxy
    upgraded the socket, the media server accepted the token, and then answered
    *requested room does not exist*. Every test here fakes the media client, and
    a fake has whatever room you ask it for.
    """
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(token_url(lesson), headers=auth_header(teacher))
    assert resp.status_code == 200

    assert fake_livekit.room.created == [f"lesson-{lesson.id}"]


# --- Tenant isolation --------------------------------------------------------


async def test_another_school_sees_no_lesson_at_all(
    client: AsyncClient, db, org, teacher, student, admin2
):
    """404, never 403: another school must not learn that the lesson exists."""
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(token_url(lesson), headers=auth_header(admin2))
    assert resp.status_code == 404


async def test_pupil_outside_the_group_is_refused(client: AsyncClient, db, org, teacher, student):
    """A pupil of this school who is not in the group gets 403.

    Not 404. The lesson's existence is no secret from somebody at the same
    school; they simply are not in it. Hiding it would be a different rule from
    the one tenant isolation asks for.
    """
    lesson = await make_lesson(db, org, teacher, [student])
    outsider = User(
        email=f"outsider-{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="x",
        full_name="Outsider",
        role=UserRole.student,
        org_id=org.id,
        is_active=True,
    )
    db.add(outsider)
    await db.flush()

    resp = await client.post(token_url(lesson), headers=auth_header(outsider))
    assert resp.status_code == 403


# --- What the grant actually carries ----------------------------------------


async def test_pupil_grant_carries_no_admin_and_no_screen(
    client: AsyncClient, db, org, teacher, student
):
    """The difference between a teacher and a pupil lives inside the token.

    This is the guard free public Jitsi could not offer at all: there the
    moderator was whoever joined first.
    """
    lesson = await make_lesson(db, org, teacher, [student])

    body = (await client.post(token_url(lesson), headers=auth_header(student))).json()
    assert body["can_publish_screen"] is False

    video = claims(body["token"])["video"]
    assert video.get("roomAdmin") in (False, None)
    assert "screen_share" not in video.get("canPublishSources", [])


async def test_teacher_grant_carries_screen_share(client: AsyncClient, db, org, teacher, student):
    lesson = await make_lesson(db, org, teacher, [student])

    body = (await client.post(token_url(lesson), headers=auth_header(teacher))).json()
    assert body["can_publish_screen"] is True
    assert "screen_share" in claims(body["token"])["video"]["canPublishSources"]


async def test_grant_expires_within_its_configured_lifetime(
    client: AsyncClient, db, org, teacher, student
):
    """A grant is a ticket, not a session.

    A token outliving a teacher's decision to remove somebody lets that person
    walk straight back in, so the lifetime is bounded and asserted.
    """
    lesson = await make_lesson(db, org, teacher, [student])

    body = (await client.post(token_url(lesson), headers=auth_header(teacher))).json()
    assert body["expires_in"] == settings.media_grant_ttl_seconds

    c = claims(body["token"])
    assert c["exp"] - c["nbf"] <= settings.media_grant_ttl_seconds + 1


# --- Removal sticks ----------------------------------------------------------


async def test_removed_pupil_cannot_get_a_fresh_grant(
    client: AsyncClient, db, org, teacher, student
):
    """Removal that only hides the interface is not removal.

    Without this guard the removed pupil reloads the page and asks for another
    token.
    """
    lesson = await make_lesson(db, org, teacher, [student])
    assert (await client.post(token_url(lesson), headers=auth_header(student))).status_code == 200

    await service.mark_removed(lesson.id, student.id)

    resp = await client.post(token_url(lesson), headers=auth_header(student))
    assert resp.status_code == 403
    assert "removed" in resp.json()["detail"]


# --- The ceiling refuses rather than degrades --------------------------------


async def test_full_host_refuses_the_next_participant(
    client: AsyncClient, db, org, teacher, student, fake_livekit
):
    """503 with a reason, and nobody already in a room is disturbed."""
    lesson = await make_lesson(db, org, teacher, [student])
    settings.max_concurrent_media_participants = 1
    fake_livekit.room.participants = 1
    await service.invalidate_capacity_cache()

    resp = await client.post(token_url(lesson), headers=auth_header(teacher))
    assert resp.status_code == 503
    assert "capacity" in resp.json()["detail"]


async def test_media_off_by_default_refuses_everybody(
    client: AsyncClient, db, org, teacher, student
):
    """Zero means off, and off refuses rather than guessing a ceiling.

    This is the state production ships in until the load test measures the real
    number.
    """
    lesson = await make_lesson(db, org, teacher, [student])
    settings.max_concurrent_media_participants = 0
    await service.invalidate_capacity_cache()

    resp = await client.post(token_url(lesson), headers=auth_header(teacher))
    assert resp.status_code == 503


# --- A lesson that has ended carries no media --------------------------------


async def test_ended_lesson_issues_no_grant(client: AsyncClient, db, org, teacher, student):
    lesson = await make_lesson(db, org, teacher, [student])
    lesson.status = "ended"
    await db.flush()

    resp = await client.post(token_url(lesson), headers=auth_header(teacher))
    assert resp.status_code == 409
