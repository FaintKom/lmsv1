"""Talking to the media server, and deciding whether there is room to.

Redis holds the live bits that die with the lesson. Every key here is
recoverable — the removed set and the breakouts from PostgreSQL, the floor and
the share grants from a teacher repeating the action — so losing Redis costs a
lesson its niceties, not its integrity.

Key names live in one place, the way :mod:`app.live_lessons.realtime` keeps its
own, and every one is prefixed ``media:`` so the two modules share a lesson
without colliding.
"""

import uuid

from livekit import api as livekit_api

from app.config import settings
from app.live_lessons import realtime
from app.live_media import grants

# How long a participant count may be reused. A class arrives together, so
# fifteen browsers ask within a second or two of each other; without this, each
# one queries the media server separately to learn the same number.
CAPACITY_CACHE_SECONDS = 2

# How long an empty room lingers before the media server discards it. Long
# enough that a teacher reloading the page does not destroy the room under the
# class, short enough that a forgotten lesson does not hold one open.
EMPTY_ROOM_TIMEOUT_SECONDS = 300

_livekit: livekit_api.LiveKitAPI | None = None


def get_livekit() -> livekit_api.LiveKitAPI:
    global _livekit
    if _livekit is None:
        _livekit = livekit_api.LiveKitAPI(
            url=settings.livekit_url.replace("ws://", "http://").replace("wss://", "https://"),
            api_key=settings.livekit_api_key,
            api_secret=settings.livekit_api_secret,
        )
    return _livekit


def set_livekit(client) -> None:
    """Test hook: inject a fake client, or None to reset.

    Mirrors ``realtime.set_redis``. Tests must not reach a real media server,
    and a module-level singleton is otherwise unreplaceable.
    """
    global _livekit
    _livekit = client


# --- Redis key helpers (single source of truth for key names) ---


def capacity_key() -> str:
    return "media:capacity"


def removed_key(lesson_id: uuid.UUID) -> str:
    return f"lesson:{lesson_id}:media:removed"


def floor_key(lesson_id: uuid.UUID) -> str:
    return f"lesson:{lesson_id}:media:floor"


def breakouts_key(lesson_id: uuid.UUID) -> str:
    return f"lesson:{lesson_id}:media:breakouts"


def share_grants_key(lesson_id: uuid.UUID) -> str:
    return f"lesson:{lesson_id}:media:share_grants"


def recording_key(lesson_id: uuid.UUID) -> str:
    return f"lesson:{lesson_id}:media:recording"


# --- Capacity ---


async def live_participant_count() -> int:
    """How many people the media server is carrying right now, across all rooms.

    Read from the media server rather than counted here. A counter would have to
    be incremented when a grant is signed and decremented on a webhook, and
    every missed webhook leaks a slot until somebody restarts something. The
    server's own room listing is ground truth and costs one local call.
    """
    r = realtime.get_redis()
    cached = await r.get(capacity_key())
    if cached is not None:
        return int(cached)

    rooms = await get_livekit().room.list_rooms(livekit_api.ListRoomsRequest())
    total = sum(room.num_participants for room in rooms.rooms)
    await r.set(capacity_key(), total, ex=CAPACITY_CACHE_SECONDS)
    return total


async def has_capacity_for_one_more() -> bool:
    """Whether this host can carry another participant.

    Zero means media is off, which is the default until slice 0's load test
    produces a real number. Refusing while the ceiling is unknown beats guessing
    one and turning a busy lesson into three slow ones (FR-024).
    """
    ceiling = settings.max_concurrent_media_participants
    if ceiling <= 0:
        return False
    return await live_participant_count() < ceiling


async def invalidate_capacity_cache() -> None:
    """Drop the cached count so the next check reads the server again."""
    await realtime.get_redis().delete(capacity_key())


def _absent(exc: Exception) -> bool:
    """Whether the media server is telling us the participant is not there.

    Not an error, and this is the difference between a working button and a red
    toast: a teacher may allow a screen, or remove somebody, before that person
    has joined. The intent is recorded either way and applies when they arrive.
    Production found this — the fakes in the tests never raise, so every one of
    them was green while the real server answered
    `ServerError(code=not_found, message=participant not found)`.
    """
    text = str(exc).lower()
    # Two ways the media server says "there is nobody there to act on":
    #   not_found   — the room exists, that participant is not in it
    #   unavailable — no node is hosting that room at all, because it emptied
    #                 and was reaped. Production hit this second one after the
    #                 first was fixed: a teacher acting on a lesson whose room
    #                 had timed out still got a 500.
    #
    # A media server that is actually down does not reach this code: that fails
    # earlier, as a connection error from the HTTP client, and still raises.
    return "not_found" in text or "not found" in text or "no response from servers" in text


# --- Removal ---


async def mark_removed(lesson_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Remember that a teacher removed somebody.

    Checked before a grant is signed. Without it, a removal lasts exactly as
    long as it takes the removed pupil to reload the page (FR-003).
    """
    await realtime.get_redis().sadd(removed_key(lesson_id), str(user_id))


async def is_removed(lesson_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return bool(await realtime.get_redis().sismember(removed_key(lesson_id), str(user_id)))


# --- Screen sharing ---


async def may_share_screen(lesson_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return bool(await realtime.get_redis().sismember(share_grants_key(lesson_id), str(user_id)))


async def set_screen_share(
    lesson_id: uuid.UUID, user_id: uuid.UUID, room: str, *, allowed: bool
) -> bool:
    """Let a pupil share a screen, or stop them.

    Two things have to happen, and doing only the first is the bug worth naming:
    a grant is read when somebody joins, so changing it alone reaches nobody who
    is already in the room. The teacher would press the button and the screen
    would stay up. Updating the live participant is what actually withdraws it,
    and the media server drops the track as a consequence.
    """
    r = realtime.get_redis()
    key = share_grants_key(lesson_id)
    if allowed:
        await r.sadd(key, str(user_id))
    else:
        await r.srem(key, str(user_id))

    # The same permission set is spelled two different ways by the media
    # server: lower-case strings inside the signed grant, and an enum on the
    # server API. Passing the grant's spelling here fails with
    # `unknown enum label "camera"`, so the two are kept apart deliberately.
    sources = [livekit_api.TrackSource.CAMERA, livekit_api.TrackSource.MICROPHONE]
    if allowed:
        sources += [
            livekit_api.TrackSource.SCREEN_SHARE,
            livekit_api.TrackSource.SCREEN_SHARE_AUDIO,
        ]

    try:
        await get_livekit().room.update_participant(
            livekit_api.UpdateParticipantRequest(
                room=room,
                identity=str(user_id),
                permission=livekit_api.ParticipantPermission(
                    can_subscribe=True,
                    can_publish=True,
                    can_publish_data=True,
                    can_publish_sources=sources,
                ),
            )
        )
        return True
    except Exception as exc:  # noqa: BLE001 — re-raised unless it is absence
        if _absent(exc):
            return False
        raise


# --- Moderation ---


async def mute_microphone(room: str, user_id: uuid.UUID) -> bool:
    """Silence one participant's microphone.

    The media server mutes a *track*, not a person, so the track has to be found
    first. A participant who is not in the room, or who is in it with no
    microphone published, is not an error: the teacher asked for silence and
    silence is what there is.
    """
    participants = await get_livekit().room.list_participants(
        livekit_api.ListParticipantsRequest(room=room)
    )
    for participant in participants.participants:
        if participant.identity != str(user_id):
            continue
        for track in participant.tracks:
            # 2 is MICROPHONE in the media server's track-source enum.
            if getattr(track, "source", None) == 2:
                await get_livekit().room.mute_published_track(
                    livekit_api.MuteRoomTrackRequest(
                        room=room, identity=str(user_id), track_sid=track.sid, muted=True
                    )
                )
                return True
    return False


async def eject(lesson_id: uuid.UUID, user_id: uuid.UUID, room: str) -> bool:
    """Remove somebody from the room, and keep them out.

    Disconnecting alone lasts exactly as long as it takes them to reload the
    page and ask for another grant, so the removal is remembered first and the
    disconnect follows.
    """
    await mark_removed(lesson_id, user_id)
    try:
        await get_livekit().room.remove_participant(
            livekit_api.RoomParticipantIdentity(room=room, identity=str(user_id))
        )
        return True
    except Exception as exc:  # noqa: BLE001 — re-raised unless it is absence
        if _absent(exc):
            # Marked removed above, so they stay out when they try to join.
            return False
        raise


async def set_floor(lesson_id: uuid.UUID, user_id: uuid.UUID | None) -> None:
    """Focus one participant for everybody, or nobody.

    This is the existing raised hand being answered. FR-013 forbids a second
    hand-raise, so the teacher's action refers to the signal pupils already
    send rather than introducing a parallel one.
    """
    r = realtime.get_redis()
    if user_id is None:
        await r.delete(floor_key(lesson_id))
    else:
        await r.set(floor_key(lesson_id), str(user_id))


# --- Rooms ---


async def ensure_room(room: str) -> None:
    """Create this lesson's room if it is not there yet.

    ``auto_create`` is off on the media server, and deliberately so: it is what
    stops anyone holding a valid grant from conjuring a room of their own
    choosing. The consequence is that something has to create the room, and the
    only place that has already decided the caller belongs in it is the endpoint
    that signs the grant.

    Missing this cost a live lesson in production. The grant was correct, the
    proxy upgraded the socket, the media server read the token and accepted it —
    then refused with *requested room does not exist*, because nothing had ever
    created one. The unit tests could not catch it: they replace the media
    client with a fake, and a fake has every room you ask it for.

    ``CreateRoom`` returns the existing room when the name is taken, so calling
    it on each join is safe and costs one local request.
    """
    await get_livekit().room.create_room(
        livekit_api.CreateRoomRequest(name=room, empty_timeout=EMPTY_ROOM_TIMEOUT_SECONDS)
    )


async def close_room(room: str) -> None:
    """Delete a room on the media server, disconnecting whoever is in it.

    Called when a lesson ends. A missing room is not an error: a lesson nobody
    joined never had one, and ending it should not fail for that.
    """
    try:
        await get_livekit().room.delete_room(livekit_api.DeleteRoomRequest(room=room))
    except Exception:  # noqa: BLE001 — a room that is already gone is the goal
        return


# --- Breakout groups ---


async def create_breakouts(db, lesson, member_ids: list, group_size: int) -> list:
    """Split a lesson's pupils into groups of at most ``group_size``.

    Subscriptions scale with the square of a room's population, so this makes
    the media server's job *easier*, not harder: fifteen people all subscribed
    to each other is 210 video subscriptions, the same fifteen in threes is 30.
    Splitting a class is the cheapest thing a teacher can do to the host.

    Existing groups are replaced rather than added to — a teacher who splits
    twice means the second arrangement, not both at once.
    """
    from app.live_media.models import LiveBreakoutGroup

    await delete_breakouts(db, lesson)

    groups = []
    for i in range(0, len(member_ids), max(1, group_size)):
        chunk = member_ids[i : i + max(1, group_size)]
        index = len(groups) + 1
        row = LiveBreakoutGroup(
            live_lesson_id=lesson.id,
            org_id=lesson.org_id,
            index=index,
            member_ids=[str(m) for m in chunk],
        )
        db.add(row)
        groups.append(row)
    await db.flush()

    for row in groups:
        await ensure_room(grants.breakout_room_name(lesson.id, row.index))
    return groups


async def list_breakouts(db, lesson) -> list:
    from sqlalchemy import select

    from app.live_media.models import LiveBreakoutGroup

    rows = await db.execute(
        select(LiveBreakoutGroup)
        .where(LiveBreakoutGroup.live_lesson_id == lesson.id)
        .order_by(LiveBreakoutGroup.index)
    )
    return list(rows.scalars().all())


async def delete_breakouts(db, lesson) -> None:
    """Gather the class back: close every group room and forget the grouping."""
    for row in await list_breakouts(db, lesson):
        await close_room(grants.breakout_room_name(lesson.id, row.index))
        await db.delete(row)
    await db.flush()
