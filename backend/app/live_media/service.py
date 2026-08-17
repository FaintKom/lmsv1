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

# How long a participant count may be reused. A class arrives together, so
# fifteen browsers ask within a second or two of each other; without this, each
# one queries the media server separately to learn the same number.
CAPACITY_CACHE_SECONDS = 2

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


# --- Rooms ---


async def close_room(room: str) -> None:
    """Delete a room on the media server, disconnecting whoever is in it.

    Called when a lesson ends. A missing room is not an error: a lesson nobody
    joined never had one, and ending it should not fail for that.
    """
    try:
        await get_livekit().room.delete_room(livekit_api.DeleteRoomRequest(room=room))
    except Exception:  # noqa: BLE001 — a room that is already gone is the goal
        return
