"""Redis client + pub/sub bus for live lessons.

One pub/sub channel per lesson (``lesson:{id}``). Messages are JSON
envelopes: {"audience": "all"|"teacher"|"student:<uuid>", "event": str,
"data": dict}. The SSE endpoint filters by audience per subscriber.

Tests replace the client with fakeredis via :func:`set_redis`.
"""

import json
import uuid
from collections.abc import AsyncIterator

import redis.asyncio as aioredis

from app.config import settings

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        url = settings.redis_url or "redis://localhost:6379/0"
        _redis = aioredis.from_url(url, decode_responses=True)
    return _redis


def set_redis(client: aioredis.Redis | None) -> None:
    """Test hook: inject a (fake)redis client, or None to reset."""
    global _redis
    _redis = client


def channel(lesson_id: uuid.UUID) -> str:
    return f"lesson:{lesson_id}"


# --- Redis key helpers (single source of truth for key names) ---


def scene_key(lesson_id):
    return f"lesson:{lesson_id}:scene"


def presence_key(lesson_id, user_id):
    return f"lesson:{lesson_id}:presence:{user_id}"


def attendance_key(lesson_id):
    return f"lesson:{lesson_id}:att"  # hash uid -> heartbeat count


def signals_key(lesson_id):
    return f"lesson:{lesson_id}:signals"  # hash uid -> signal type


def poll_key(lesson_id):
    return f"lesson:{lesson_id}:poll"  # json of active poll


def poll_votes_key(lesson_id):
    return f"lesson:{lesson_id}:poll:votes"  # hash uid -> option idx


def active_lesson_key(student_id):
    return f"student:{student_id}:active_lesson"


def invite_key(student_id):
    return f"student:{student_id}:lesson_invite"


def teacher_seen_key(lesson_id):
    return f"lesson:{lesson_id}:teacher_seen"  # TTL = TEACHER_STALE_SECONDS


def scene_log_key(lesson_id):
    return f"lesson:{lesson_id}:scene_log"  # list of scene json entries


PRESENCE_TTL = 15  # seconds; heartbeat every 5s
INVITE_TTL = 4 * 3600  # 4h, deleted explicitly on end
TEACHER_STALE_SECONDS = 600  # no teacher heartbeat for 10 min => stale lesson


async def publish(lesson_id: uuid.UUID, audience: str, event: str, data: dict) -> None:
    msg = json.dumps({"audience": audience, "event": event, "data": data})
    await get_redis().publish(channel(lesson_id), msg)


async def subscribe(lesson_id: uuid.UUID) -> AsyncIterator[dict]:
    """Yield envelope dicts published to this lesson's channel."""
    pubsub = get_redis().pubsub()
    await pubsub.subscribe(channel(lesson_id))
    try:
        async for raw in pubsub.listen():
            if raw.get("type") != "message":
                continue
            yield json.loads(raw["data"])
    finally:
        await pubsub.unsubscribe(channel(lesson_id))
        await pubsub.aclose()
