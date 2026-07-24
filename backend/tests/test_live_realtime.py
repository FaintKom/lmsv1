import asyncio
import uuid

from app.live_lessons import realtime


async def test_publish_reaches_subscriber():
    lesson_id = uuid.uuid4()
    received = []

    async def consume():
        async for msg in realtime.subscribe(lesson_id):
            received.append(msg)
            break

    task = asyncio.create_task(consume())
    await asyncio.sleep(0.05)  # let subscriber attach
    await realtime.publish(lesson_id, "all", "scene_changed", {"type": "blank"})
    await asyncio.wait_for(task, timeout=2)
    assert received == [{"audience": "all", "event": "scene_changed", "data": {"type": "blank"}}]


async def test_kv_roundtrip():
    r = realtime.get_redis()
    await r.set("k1", "v1", ex=60)
    assert await r.get("k1") == "v1"
