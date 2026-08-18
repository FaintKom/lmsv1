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
from livekit import api as livekit_api
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


class _FakeTrack:
    def __init__(self, sid: str, source):
        self.sid = sid
        self.source = source


class _FakeParticipant:
    def __init__(self, identity: str, tracks):
        self.identity = identity
        self.tracks = tracks


class _FakeParticipants:
    def __init__(self, participants):
        self.participants = participants


class _FakeRoomService:
    def __init__(self, participants: int = 0):
        self.participants = participants
        self.deleted: list[str] = []
        self.created: list[str] = []
        self.muted: list[tuple] = []
        self.removed: list[tuple] = []
        self.updated: list[tuple] = []
        # Identity -> published tracks, so a mute has something to aim at.
        self.in_room: dict[str, list] = {}
        # Off by default so the older tests stay about what they were about.
        # Switched on where absence is the thing under test: a fake that never
        # refuses cannot catch a caller that does not handle refusal, which is
        # exactly how the 500s below reached production.
        self.strict_presence = False

    async def list_rooms(self, _request):
        return _FakeRooms([_FakeRoom(self.participants)] if self.participants else [])

    async def create_room(self, request):
        self.created.append(request.name)

    async def delete_room(self, request):
        self.deleted.append(request.room)

    async def list_participants(self, request):
        return _FakeParticipants(
            [_FakeParticipant(i, t) for i, t in self.in_room.items()],
        )

    async def mute_published_track(self, request):
        self.muted.append((request.room, request.identity, request.track_sid, request.muted))

    async def remove_participant(self, request):
        if request.identity not in self.in_room and self.strict_presence:
            raise RuntimeError("ServerError(code=not_found, message=participant not found)")
        self.removed.append((request.room, request.identity))

    async def update_participant(self, request):
        if request.identity not in self.in_room and self.strict_presence:
            raise RuntimeError("ServerError(code=not_found, message=participant not found)")
        sources = list(getattr(request.permission, "can_publish_sources", []) or [])
        self.updated.append((request.room, request.identity, sources))


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


# --- Running the room: mute, remove, floor ----------------------------------


async def test_teacher_mutes_a_pupil(client: AsyncClient, db, org, teacher, student, fake_livekit):
    """Positive control. Every refusal below means nothing without this passing."""
    lesson = await make_lesson(db, org, teacher, [student])
    fake_livekit.room.in_room[str(student.id)] = [_FakeTrack("TR_mic", 2)]

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/participants/{student.id}/mute",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    assert fake_livekit.room.muted == [(f"lesson-{lesson.id}", str(student.id), "TR_mic", True)]


async def test_pupil_cannot_mute_anybody(client: AsyncClient, db, org, teacher, student):
    """A pupil holding a valid grant is still not a moderator."""
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/participants/{teacher.id}/mute",
        headers=auth_header(student),
    )
    assert resp.status_code == 403


async def test_moderating_a_stranger_is_not_found(
    client: AsyncClient, db, org, org2, teacher, student, admin2
):
    """The target is resolved through the lesson's own membership.

    An identifier arriving in a request is never used on trust, so a teacher
    naming somebody from another school gets 404 rather than acting on them.
    """
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/participants/{admin2.id}/mute",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 404


async def test_removing_a_pupil_disconnects_and_keeps_them_out(
    client: AsyncClient, db, org, teacher, student, fake_livekit
):
    """Removal has to survive a page reload, or it is theatre."""
    lesson = await make_lesson(db, org, teacher, [student])
    assert (await client.post(token_url(lesson), headers=auth_header(student))).status_code == 200

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/participants/{student.id}/remove",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    assert fake_livekit.room.removed == [(f"lesson-{lesson.id}", str(student.id))]

    again = await client.post(token_url(lesson), headers=auth_header(student))
    assert again.status_code == 403


async def test_teacher_gives_and_takes_back_the_floor(
    client: AsyncClient, db, org, teacher, student
):
    """The floor is the existing raised hand answered, not a second signal."""
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/floor",
        json={"user_id": str(student.id)},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    assert resp.json()["user_id"] == str(student.id)

    cleared = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/floor",
        json={"user_id": None},
        headers=auth_header(teacher),
    )
    assert cleared.status_code == 200
    assert cleared.json()["user_id"] is None


async def test_pupil_cannot_take_the_floor(client: AsyncClient, db, org, teacher, student):
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/floor",
        json={"user_id": str(student.id)},
        headers=auth_header(student),
    )
    assert resp.status_code == 403


# --- Screen sharing is a teacher's to give and to take back ------------------


async def test_screen_share_is_granted_then_withdrawn(
    client: AsyncClient, db, org, teacher, student, fake_livekit
):
    """A pupil's grant gains the source only while the teacher permits it."""
    lesson = await make_lesson(db, org, teacher, [student])

    before = (await client.post(token_url(lesson), headers=auth_header(student))).json()
    assert before["can_publish_screen"] is False

    granted = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/participants/{student.id}/screen-share",
        json={"allowed": True},
        headers=auth_header(teacher),
    )
    assert granted.status_code == 200

    during = (await client.post(token_url(lesson), headers=auth_header(student))).json()
    assert during["can_publish_screen"] is True
    assert "screen_share" in claims(during["token"])["video"]["canPublishSources"]

    withdrawn = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/participants/{student.id}/screen-share",
        json={"allowed": False},
        headers=auth_header(teacher),
    )
    assert withdrawn.status_code == 200

    after = (await client.post(token_url(lesson), headers=auth_header(student))).json()
    assert after["can_publish_screen"] is False


async def test_withdrawing_screen_share_stops_a_share_already_running(
    client: AsyncClient, db, org, teacher, student, fake_livekit
):
    """A new grant only affects the next join.

    Somebody already in the room keeps the permissions they entered with, so
    withdrawing has to reach the live participant too — otherwise the teacher
    presses the button and the screen stays up (FR-014).
    """
    lesson = await make_lesson(db, org, teacher, [student])
    fake_livekit.room.in_room[str(student.id)] = []
    url = f"/api/v1/live-lessons/{lesson.id}/media/participants/{student.id}/screen-share"

    # Positive control first. Asserting only the absence of a value would pass
    # against a list that never contained it — including the wrong-typed list
    # this test caught once already, where the permission is an enum and the
    # assertion was written against the grant's lower-case spelling.
    await client.post(url, json={"allowed": True}, headers=auth_header(teacher))
    room, identity, granted = fake_livekit.room.updated[-1]
    assert room == f"lesson-{lesson.id}"
    assert identity == str(student.id)
    assert livekit_api.TrackSource.SCREEN_SHARE in granted

    await client.post(url, json={"allowed": False}, headers=auth_header(teacher))
    _, _, withdrawn = fake_livekit.room.updated[-1]
    assert livekit_api.TrackSource.SCREEN_SHARE not in withdrawn
    assert livekit_api.TrackSource.MICROPHONE in withdrawn


async def test_pupil_cannot_grant_themselves_a_screen(
    client: AsyncClient, db, org, teacher, student
):
    lesson = await make_lesson(db, org, teacher, [student])

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/participants/{student.id}/screen-share",
        json={"allowed": True},
        headers=auth_header(student),
    )
    assert resp.status_code == 403


# --- Acting on somebody who has not joined -----------------------------------


async def test_allowing_a_screen_before_the_pupil_joins_is_not_an_error(
    client: AsyncClient, db, org, teacher, student, fake_livekit
):
    """Production returned 500 here, and the whole suite was green.

    A teacher may allow a screen, or remove somebody, before that person has
    joined the room. The media server answers `participant not found`; the
    intent is still recorded and applies the moment they arrive. Every fake in
    this file used to accept any identity, so nothing noticed.
    """
    lesson = await make_lesson(db, org, teacher, [student])
    fake_livekit.room.strict_presence = True  # behave like the real server

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/participants/{student.id}/screen-share",
        json={"allowed": True},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["applied"] is False

    # Recorded regardless: the next grant carries the screen.
    granted = (await client.post(token_url(lesson), headers=auth_header(student))).json()
    assert granted["can_publish_screen"] is True


async def test_removing_somebody_who_never_joined_still_keeps_them_out(
    client: AsyncClient, db, org, teacher, student, fake_livekit
):
    """The disconnect fails, the ban holds. That is the half that matters."""
    lesson = await make_lesson(db, org, teacher, [student])
    fake_livekit.room.strict_presence = True

    resp = await client.post(
        f"/api/v1/live-lessons/{lesson.id}/media/participants/{student.id}/remove",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["applied"] is False

    refused = await client.post(token_url(lesson), headers=auth_header(student))
    assert refused.status_code == 403


async def test_a_real_media_failure_is_still_an_error(
    client: AsyncClient, db, org, teacher, student, fake_livekit
):
    """Absence is tolerated; a broken media server is not.

    Without this the fix would be indistinguishable from swallowing every
    failure, and a media server that is down would look like a working button.
    """

    async def boom(_request):
        raise RuntimeError("connection refused")

    fake_livekit.room.remove_participant = boom
    lesson = await make_lesson(db, org, teacher, [student])

    # The test transport re-raises rather than rendering a 500, which suits the
    # assertion: what matters is that the failure is not swallowed.
    with pytest.raises(RuntimeError, match="connection refused"):
        await client.post(
            f"/api/v1/live-lessons/{lesson.id}/media/participants/{student.id}/remove",
            headers=auth_header(teacher),
        )
