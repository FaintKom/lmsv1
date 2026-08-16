# Live Lesson Mode — Backend Implementation Plan (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend for live lessons: lifecycle, scene broadcast over SSE + Redis pub/sub, presence, boards, signals/polls, drafts, journal/attendance integration.

**Architecture:** New feature module `backend/app/live_lessons/` (models/schemas/router/service + `realtime.py` bus). Live state in Redis with TTL; durable state in Postgres. SSE = hand-rolled `StreamingResponse` (no new runtime dep). Tests use `fakeredis`.

**Tech Stack:** FastAPI async, SQLAlchemy 2 async, Alembic (raw-SQL migrations), redis.asyncio, pytest (+fakeredis), httpx.

**Spec:** `docs/superpowers/specs/2026-07-23-live-lesson-mode-design.md`. Frontend — Plan 2 (separate file).

**Conventions used throughout (from codebase):**
- Auth deps: `from app.auth.dependencies import get_current_user, require_role`; roles enum `from app.auth.models import User, UserRole`.
- DB: `from app.db.session import get_db` → `db: AsyncSession = Depends(get_db)`; `get_db` commits on success.
- Models inherit `Base, IDMixin, TimestampMixin` from `app.db.base` (UUID pk, created_at/updated_at — do NOT redeclare).
- Org isolation: every query filters `org_id == user.org_id`.
- Tests: fixtures `db`, `client`, `org`, `teacher`, `student`, `admin` + helper `auth_header(user)` from `backend/tests/conftest.py`; `asyncio_mode=auto` (no marker needed). Run from `backend/`.
- `status` / `follow_mode` / `kind` are `String` columns validated in app code, NOT Postgres enums (enum migration gotchas — docs/MIGRATIONS.md).

---

### Task 1: Dependencies, models, migration, registration

**Files:**
- Modify: `backend/pyproject.toml` (dev deps)
- Create: `backend/app/live_lessons/__init__.py`
- Create: `backend/app/live_lessons/models.py`
- Create: `backend/alembic/versions/<autogen-id>_add_live_lessons.py`
- Modify: `backend/app/main.py` (model import in lifespan block, ~line 296-331)
- Modify: `backend/tests/conftest.py` (model import block, ~line 24-60)
- Modify: `backend/alembic/env.py` (model import block)

- [ ] **Step 1: Add fakeredis to dev deps**

In `backend/pyproject.toml`, `[project.optional-dependencies] dev = [...]` list, add:

```toml
    "fakeredis>=2.26",
```

Run: `cd backend && pip install -e .[dev]`
Expected: installs fakeredis.

- [ ] **Step 2: Create module + models**

`backend/app/live_lessons/__init__.py` — empty file.

`backend/app/live_lessons/models.py`:

```python
"""Live lesson models.

A LiveLesson is one real-time class run by a teacher for a StudentGroup.
Live state (scene, presence, signals, polls) lives in Redis with TTLs;
these tables hold the durable part: the lesson row, its boards and the
per-exercise drafts students autosave during a lesson.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class LiveLesson(Base, IDMixin, TimestampMixin):
    __tablename__ = "live_lessons"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("student_groups.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True,
    )
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    class_session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("class_sessions.id", ondelete="SET NULL"), nullable=True,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    follow_mode: Mapped[str] = mapped_column(String(10), nullable=False, default="free")
    # Mirror of the Redis scene key — survives a Redis restart.
    current_scene: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class LessonBoard(Base, IDMixin, TimestampMixin):
    __tablename__ = "lesson_boards"

    live_lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("live_lessons.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="board")
    scene: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    material_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)


class ExerciseDraft(Base, IDMixin, TimestampMixin):
    __tablename__ = "exercise_drafts"
    __table_args__ = (
        UniqueConstraint("exercise_id", "student_id", name="uq_exercise_drafts_ex_student"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exercises.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    answers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    source_code: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 3: Register models in THREE places** (else metadata/autogenerate is blind — backend/CLAUDE.md)

In `backend/app/main.py`, lifespan model-import block (search the `# noqa` imports around line 296-331), add:

```python
    import app.live_lessons.models  # noqa
```

Same line in `backend/tests/conftest.py` (import block ~line 24-60) and in `backend/alembic/env.py` (model import block).

- [ ] **Step 4: Create migration**

Run: `cd backend && alembic revision -m "add live lessons"`
Then fill the generated file (raw SQL, rerun-safe — project convention; keep the generated `revision`/`down_revision` header):

```python
def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS live_lessons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
            course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
            teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
            class_session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            follow_mode VARCHAR(10) NOT NULL DEFAULT 'free',
            current_scene JSONB,
            ended_at TIMESTAMPTZ,
            summary JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_live_lessons_org_id ON live_lessons (org_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_live_lessons_group_id ON live_lessons (group_id)")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_live_lessons_active_group "
        "ON live_lessons (group_id) WHERE status = 'active'"
    )
    op.execute("""
        CREATE TABLE IF NOT EXISTS lesson_boards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            live_lesson_id UUID NOT NULL REFERENCES live_lessons(id) ON DELETE CASCADE,
            kind VARCHAR(20) NOT NULL DEFAULT 'board',
            scene JSONB NOT NULL DEFAULT '{}'::jsonb,
            version INTEGER NOT NULL DEFAULT 0,
            material_ref VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_lesson_boards_lesson ON lesson_boards (live_lesson_id)")
    op.execute("""
        CREATE TABLE IF NOT EXISTS exercise_drafts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
            student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            answers JSONB,
            source_code TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_exercise_drafts_ex_student UNIQUE (exercise_id, student_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_exercise_drafts_org_id ON exercise_drafts (org_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS exercise_drafts")
    op.execute("DROP TABLE IF EXISTS lesson_boards")
    op.execute("DROP TABLE IF EXISTS live_lessons")
```

- [ ] **Step 5: Apply + sanity**

Run: `cd backend && alembic upgrade head && alembic downgrade -1 && alembic upgrade head`
Expected: both directions clean.

- [ ] **Step 6: Commit**

```bash
git add backend/pyproject.toml backend/app/live_lessons backend/alembic/versions backend/app/main.py backend/tests/conftest.py backend/alembic/env.py
git commit -m "feat(live-lessons): models + migration for live_lessons, lesson_boards, exercise_drafts"
```

---

### Task 2: Realtime bus (`realtime.py`) + test Redis wiring

**Files:**
- Create: `backend/app/live_lessons/realtime.py`
- Modify: `backend/tests/conftest.py` (fakeredis autouse fixture)
- Test: `backend/tests/test_live_realtime.py`

- [ ] **Step 1: Write failing tests**

`backend/tests/test_live_realtime.py`:

```python
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
    assert received == [
        {"audience": "all", "event": "scene_changed", "data": {"type": "blank"}}
    ]


async def test_kv_roundtrip():
    r = realtime.get_redis()
    await r.set("k1", "v1", ex=60)
    assert await r.get("k1") == "v1"
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && pytest tests/test_live_realtime.py -v`
Expected: FAIL — module `app.live_lessons.realtime` doesn't exist.

- [ ] **Step 3: Implement `realtime.py`**

```python
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

def scene_key(lesson_id): return f"lesson:{lesson_id}:scene"
def presence_key(lesson_id, user_id): return f"lesson:{lesson_id}:presence:{user_id}"
def attendance_key(lesson_id): return f"lesson:{lesson_id}:att"          # hash uid -> heartbeat count
def signals_key(lesson_id): return f"lesson:{lesson_id}:signals"         # hash uid -> signal type
def poll_key(lesson_id): return f"lesson:{lesson_id}:poll"               # json of active poll
def poll_votes_key(lesson_id): return f"lesson:{lesson_id}:poll:votes"   # hash uid -> option idx
def active_lesson_key(student_id): return f"student:{student_id}:active_lesson"
def invite_key(student_id): return f"student:{student_id}:lesson_invite"

PRESENCE_TTL = 15            # seconds; heartbeat every 5s
INVITE_TTL = 4 * 3600        # 4h, deleted explicitly on end
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
```

- [ ] **Step 4: Wire fakeredis into conftest**

In `backend/tests/conftest.py` add near the other autouse fixtures:

```python
@pytest.fixture(autouse=True)
async def _fake_redis():
    """Every test gets a fresh in-memory redis for live_lessons."""
    import fakeredis.aioredis as fakeredis

    from app.live_lessons import realtime

    client = fakeredis.FakeRedis(decode_responses=True)
    realtime.set_redis(client)
    yield
    await client.flushall()
    realtime.set_redis(None)
```

- [ ] **Step 5: Run tests**

Run: `cd backend && pytest tests/test_live_realtime.py -v`
Expected: 2 PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/live_lessons/realtime.py backend/tests/test_live_realtime.py backend/tests/conftest.py
git commit -m "feat(live-lessons): redis pub/sub bus + key helpers, fakeredis test wiring"
```

---

### Task 3: Schemas

**Files:**
- Create: `backend/app/live_lessons/schemas.py`

- [ ] **Step 1: Write schemas** (no test — pure declarations, they get exercised by every router test from Task 4 on)

```python
"""Pydantic schemas for live lessons."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class StartLessonRequest(BaseModel):
    group_id: uuid.UUID
    course_id: uuid.UUID | None = None
    class_session_id: uuid.UUID | None = None


class SceneRequest(BaseModel):
    type: Literal["blank", "board", "material", "task", "solution"]
    payload: dict = Field(default_factory=dict)


class SettingsRequest(BaseModel):
    follow_mode: Literal["strict", "free"]


class LiveLessonResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    group_id: uuid.UUID
    course_id: uuid.UUID | None
    teacher_id: uuid.UUID | None
    class_session_id: uuid.UUID | None
    status: str
    follow_mode: str
    current_scene: dict | None
    created_at: datetime
    ended_at: datetime | None
    summary: dict | None
    model_config = {"from_attributes": True}


class LessonStateResponse(BaseModel):
    lesson: LiveLessonResponse
    my_signal: str | None = None
    active_poll: dict | None = None


class BoardCreateRequest(BaseModel):
    kind: Literal["board", "annotation"] = "board"
    material_ref: str | None = Field(default=None, max_length=255)


class BoardResponse(BaseModel):
    id: uuid.UUID
    kind: str
    scene: dict
    version: int
    material_ref: str | None
    model_config = {"from_attributes": True}


class BoardDeltaRequest(BaseModel):
    updated: list[dict] = Field(default_factory=list)
    deleted: list[str] = Field(default_factory=list)
    version: int


class HeartbeatRequest(BaseModel):
    current_view: str = Field(default="", max_length=255)
    exercise_id: uuid.UUID | None = None


class SignalRequest(BaseModel):
    type: Literal["hand", "confused", "done"]


class PollCreateRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    options: list[str] = Field(min_length=2, max_length=10)


class VoteRequest(BaseModel):
    option: int = Field(ge=0)


class MessageRequest(BaseModel):
    student_id: uuid.UUID
    text: str = Field(min_length=1, max_length=2000)


class DraftRequest(BaseModel):
    answers: dict | None = None
    source_code: str | None = Field(default=None, max_length=100_000)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/live_lessons/schemas.py
git commit -m "feat(live-lessons): pydantic schemas"
```

---

### Task 4: Service — lifecycle (start / end / access / stale auto-end)

**Files:**
- Create: `backend/app/live_lessons/service.py`
- Modify: `backend/app/live_lessons/realtime.py` (two more key helpers)
- Test: `backend/tests/test_live_lessons.py`

- [ ] **Step 1: Add key helpers to `realtime.py`** (below the other key helpers)

```python
def teacher_seen_key(lesson_id): return f"lesson:{lesson_id}:teacher_seen"  # TTL = TEACHER_STALE_SECONDS
def scene_log_key(lesson_id): return f"lesson:{lesson_id}:scene_log"        # list of scene json entries
```

- [ ] **Step 2: Write failing tests**

`backend/tests/test_live_lessons.py` (this file grows across Tasks 4-9; start it now). A local `make_group` helper keeps tests DRY:

```python
import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import StudentGroup, StudentGroupMember
from app.live_lessons import realtime
from tests.conftest import auth_header


async def make_group(db: AsyncSession, org, teacher, students=()) -> StudentGroup:
    g = StudentGroup(org_id=org.id, name="Live G", teacher_id=teacher.id)
    db.add(g)
    await db.flush()
    for s in students:
        db.add(StudentGroupMember(group_id=g.id, user_id=s.id))
    await db.flush()
    return g


async def test_start_lesson(client: AsyncClient, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    resp = await client.post(
        "/api/v1/live-lessons",
        json={"group_id": str(g.id)},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "active"
    assert body["current_scene"]["type"] == "blank"
    # invite key set for the student
    r = realtime.get_redis()
    assert await r.get(realtime.invite_key(student.id)) == body["id"]


async def test_start_conflicts_when_active_and_fresh(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    r1 = await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                           headers=auth_header(teacher))
    assert r1.status_code == 201
    r2 = await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                           headers=auth_header(teacher))
    assert r2.status_code == 409
    assert r2.json()["detail"]["active_lesson_id"] == r1.json()["id"]


async def test_start_auto_ends_stale_lesson(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    r1 = await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                           headers=auth_header(teacher))
    lesson_id = r1.json()["id"]
    # simulate teacher gone: drop the teacher_seen key
    await realtime.get_redis().delete(realtime.teacher_seen_key(uuid.UUID(lesson_id)))
    r2 = await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                           headers=auth_header(teacher))
    assert r2.status_code == 201
    assert r2.json()["id"] != lesson_id


async def test_student_cannot_start(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    resp = await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                             headers=auth_header(student))
    assert resp.status_code == 403


async def test_end_lesson_writes_summary(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    r1 = await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                           headers=auth_header(teacher))
    lesson_id = r1.json()["id"]
    resp = await client.post(f"/api/v1/live-lessons/{lesson_id}/end",
                             headers=auth_header(teacher))
    assert resp.status_code == 200
    assert resp.json()["status"] == "ended"
    assert resp.json()["summary"] is not None
    # invite cleaned up
    assert await realtime.get_redis().get(realtime.invite_key(student.id)) is None
```

- [ ] **Step 3: Run to verify failure**

Run: `cd backend && pytest tests/test_live_lessons.py -v`
Expected: FAIL — 404s (no router yet) / import errors.

- [ ] **Step 4: Implement service lifecycle**

`backend/app/live_lessons/service.py`:

```python
"""Live lesson service: lifecycle, scene, presence, boards, signals, polls."""
import json
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import StudentGroup, StudentGroupMember
from app.attendance.models import AttendanceRecord, AttendanceStatus
from app.auth.models import User, UserRole
from app.live_lessons import realtime
from app.live_lessons.models import LessonBoard, LiveLesson
from app.notifications.service import create_notification

ATTENDANCE_PRESENT_SECONDS = 300  # >=5 min of heartbeats => present
HEARTBEAT_SECONDS = 5             # client cadence; attendance = count * this


async def group_member_ids(db: AsyncSession, group_id: uuid.UUID) -> list[uuid.UUID]:
    rows = await db.execute(
        select(StudentGroupMember.user_id).where(StudentGroupMember.group_id == group_id)
    )
    return [r[0] for r in rows]


async def get_lesson_for_user(
    db: AsyncSession, lesson_id: uuid.UUID, user: User
) -> tuple[LiveLesson, bool]:
    """Return (lesson, is_teacher_view). Raises ValueError (404) / PermissionError (403)."""
    lesson = await db.scalar(
        select(LiveLesson).where(LiveLesson.id == lesson_id, LiveLesson.org_id == user.org_id)
    )
    if lesson is None:
        raise ValueError("lesson not found")
    if user.role in (UserRole.admin, UserRole.super_admin) or user.id == lesson.teacher_id:
        return lesson, True
    member = await db.scalar(
        select(StudentGroupMember).where(
            StudentGroupMember.group_id == lesson.group_id,
            StudentGroupMember.user_id == user.id,
        )
    )
    if member is None:
        raise PermissionError("not a participant")
    return lesson, False


async def _teacher_stale(lesson: LiveLesson) -> bool:
    r = realtime.get_redis()
    return await r.get(realtime.teacher_seen_key(lesson.id)) is None


async def start_lesson(
    db: AsyncSession,
    user: User,
    group_id: uuid.UUID,
    course_id: uuid.UUID | None,
    class_session_id: uuid.UUID | None,
) -> tuple[LiveLesson, bool]:
    """Returns (lesson, created). created=False => caller responds 409."""
    group = await db.scalar(
        select(StudentGroup).where(StudentGroup.id == group_id, StudentGroup.org_id == user.org_id)
    )
    if group is None:
        raise ValueError("group not found")
    existing = await db.scalar(
        select(LiveLesson).where(LiveLesson.group_id == group_id, LiveLesson.status == "active")
    )
    if existing is not None:
        if await _teacher_stale(existing):
            await finalize_lesson(db, existing)
        else:
            return existing, False

    lesson = LiveLesson(
        org_id=user.org_id,
        group_id=group_id,
        course_id=course_id or group.course_id,
        teacher_id=user.id,
        class_session_id=class_session_id,
        current_scene={"type": "blank", "payload": {}},
    )
    db.add(lesson)
    await db.flush()

    r = realtime.get_redis()
    await r.set(realtime.scene_key(lesson.id), json.dumps(lesson.current_scene))
    await r.set(realtime.teacher_seen_key(lesson.id), "1", ex=realtime.TEACHER_STALE_SECONDS)
    for sid in await group_member_ids(db, group_id):
        await r.set(realtime.invite_key(sid), str(lesson.id), ex=realtime.INVITE_TTL)
        await create_notification(
            db,
            user_id=sid,
            title="Live lesson started",
            body=group.name,
            link=f"/lesson/{lesson.id}",
        )
    return lesson, True


async def finalize_lesson(db: AsyncSession, lesson: LiveLesson) -> LiveLesson:
    """End a lesson: summary, attendance records, redis cleanup, broadcast."""
    r = realtime.get_redis()
    att_raw = await r.hgetall(realtime.attendance_key(lesson.id))
    attendance_seconds = {uid: int(c) * HEARTBEAT_SECONDS for uid, c in att_raw.items()}
    member_ids = await group_member_ids(db, lesson.group_id)

    if lesson.course_id is not None:
        today = date.today()
        for sid in member_ids:
            seconds = attendance_seconds.get(str(sid), 0)
            status = (
                AttendanceStatus.present
                if seconds >= ATTENDANCE_PRESENT_SECONDS
                else AttendanceStatus.absent
            )
            existing = await db.scalar(
                select(AttendanceRecord).where(
                    AttendanceRecord.student_id == sid,
                    AttendanceRecord.course_id == lesson.course_id,
                    AttendanceRecord.session_date == today,
                )
            )
            if existing is not None:
                existing.status = status
            else:
                db.add(AttendanceRecord(
                    org_id=lesson.org_id,
                    student_id=sid,
                    course_id=lesson.course_id,
                    session_date=today,
                    status=status,
                    marked_by=lesson.teacher_id,
                ))

    scene_log = [json.loads(s) for s in await r.lrange(realtime.scene_log_key(lesson.id), 0, -1)]
    poll_raw = await r.get(realtime.poll_key(lesson.id))
    lesson.summary = {
        "attendance_seconds": attendance_seconds,
        "scenes": scene_log,
        "last_poll": json.loads(poll_raw) if poll_raw else None,
    }
    lesson.status = "ended"
    lesson.ended_at = datetime.now(timezone.utc)

    await realtime.publish(lesson.id, "all", "lesson_ended", {})
    for sid in member_ids:
        await r.delete(realtime.invite_key(sid), realtime.active_lesson_key(sid))
    await r.delete(
        realtime.scene_key(lesson.id),
        realtime.attendance_key(lesson.id),
        realtime.signals_key(lesson.id),
        realtime.poll_key(lesson.id),
        realtime.poll_votes_key(lesson.id),
        realtime.teacher_seen_key(lesson.id),
        realtime.scene_log_key(lesson.id),
    )
    return lesson
```

- [ ] **Step 5: Implement router lifecycle + mount**

`backend/app/live_lessons/router.py`:

```python
"""Live lessons API."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.live_lessons import realtime, service
from app.live_lessons.models import LiveLesson
from app.live_lessons.schemas import (
    LessonStateResponse,
    LiveLessonResponse,
    StartLessonRequest,
)

router = APIRouter()


def _teacher_dep():
    return Depends(require_role(UserRole.admin, UserRole.teacher))


@router.post("", response_model=LiveLessonResponse, status_code=201)
async def start_lesson_endpoint(
    data: StartLessonRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    try:
        lesson, created = await service.start_lesson(
            db, user, data.group_id, data.course_id, data.class_session_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    if not created:
        raise HTTPException(status_code=409, detail={"active_lesson_id": str(lesson.id)})
    return LiveLessonResponse.model_validate(lesson)


@router.post("/{lesson_id}/end", response_model=LiveLessonResponse)
async def end_lesson_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    try:
        lesson, is_teacher = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    if not is_teacher:
        raise HTTPException(status_code=403, detail="forbidden")
    if lesson.status == "active":
        lesson = await service.finalize_lesson(db, lesson)
    return LiveLessonResponse.model_validate(lesson)


@router.get("/active")
async def active_lesson_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role in (UserRole.admin, UserRole.teacher, UserRole.super_admin):
        lesson = await db.scalar(
            select(LiveLesson).where(
                LiveLesson.teacher_id == user.id, LiveLesson.status == "active"
            )
        )
        return {"lesson_id": str(lesson.id) if lesson else None}
    lesson_id = await realtime.get_redis().get(realtime.invite_key(user.id))
    return {"lesson_id": lesson_id}


@router.get("/{lesson_id}", response_model=LessonStateResponse)
async def lesson_state_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import json as _json

    try:
        lesson, _ = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    # lazy auto-end
    if lesson.status == "active" and await service._teacher_stale(lesson):
        lesson = await service.finalize_lesson(db, lesson)
    r = realtime.get_redis()
    my_signal = await r.hget(realtime.signals_key(lesson.id), str(user.id))
    poll_raw = await r.get(realtime.poll_key(lesson.id))
    return LessonStateResponse(
        lesson=LiveLessonResponse.model_validate(lesson),
        my_signal=my_signal,
        active_poll=_json.loads(poll_raw) if poll_raw else None,
    )
```

Mount in `backend/app/main.py`: import `from app.live_lessons.router import router as live_lessons_router` (alphabetical block, ~line 41-82) and inside `create_app()` next to the meetings mount (~line 486):

```python
    app.include_router(live_lessons_router, prefix="/api/v1/live-lessons", tags=["Live Lessons"])
```

⚠️ Route-order note: `/active` is declared BEFORE `/{lesson_id}` — keep it that way or `active` parses as a UUID and 422s.

- [ ] **Step 6: Run tests**

Run: `cd backend && pytest tests/test_live_lessons.py -v`
Expected: 5 PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/live_lessons backend/app/main.py backend/tests/test_live_lessons.py
git commit -m "feat(live-lessons): lifecycle service + router (start/end/active/state, stale auto-end)"
```

---

### Task 5: Scene + settings

**Files:**
- Modify: `backend/app/live_lessons/service.py`
- Modify: `backend/app/live_lessons/router.py`
- Test: `backend/tests/test_live_lessons.py` (append)

- [ ] **Step 1: Append failing tests**

```python
async def test_set_scene_and_state(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/scene",
        json={"type": "material", "payload": {"lesson_id": str(uuid.uuid4())}},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    state = await client.get(f"/api/v1/live-lessons/{lesson_id}",
                             headers=auth_header(student))
    assert state.json()["lesson"]["current_scene"]["type"] == "material"


async def test_student_cannot_set_scene(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    resp = await client.patch(f"/api/v1/live-lessons/{lesson_id}/scene",
                              json={"type": "blank", "payload": {}},
                              headers=auth_header(student))
    assert resp.status_code == 403


async def test_solution_scene_embeds_submission(client, db, org, teacher, student):
    from datetime import datetime, timezone

    from app.exercises.models import ExerciseSubmission
    from tests.conftest import make_course, make_exercise, make_lesson, make_module

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson_row = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson_row.id, org.id)
    sub = ExerciseSubmission(
        exercise_id=ex.id, student_id=student.id, answers={"q1": "a"},
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(sub)
    await db.flush()

    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/scene",
        json={"type": "solution",
              "payload": {"submission_id": str(sub.id), "anonymous": True}},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    scene = resp.json()["current_scene"]
    assert scene["payload"]["answers"] == {"q1": "a"}
    assert scene["payload"]["student_name"] is None  # anonymous
```

Factory signatures (verified in `backend/tests/conftest.py:278-351`): `make_course(db, org, teacher, **kw)`, `make_module(db, course_id, **kw)`, `make_lesson(db, module_id, **kw)`, `make_exercise(db, lesson_id, org_id, **kw)` — plain module-level helpers, imported from `tests.conftest`, not fixtures.

- [ ] **Step 2: Run — verify failure** (`pytest tests/test_live_lessons.py -v` → new tests FAIL with 405)

- [ ] **Step 3: Implement in service.py**

```python
SOLUTION_PAYLOAD_CAP = 64_000  # bytes of JSON


async def _solution_payload(db: AsyncSession, lesson: LiveLesson, payload: dict) -> dict:
    """Server builds the snapshot so students never fetch each other's data."""
    from app.exercises.models import ExerciseSubmission
    from app.live_lessons.models import ExerciseDraft

    anonymous = bool(payload.get("anonymous", False))
    answers, source_code, student_id, exercise_id = None, None, None, None

    if payload.get("submission_id"):
        sub = await db.get(ExerciseSubmission, uuid.UUID(str(payload["submission_id"])))
        if sub is None:
            raise ValueError("submission not found")
        answers, source_code = sub.answers, getattr(sub, "source_code", None)
        student_id, exercise_id = sub.student_id, sub.exercise_id
    elif payload.get("student_id") and payload.get("exercise_id"):
        student_id = uuid.UUID(str(payload["student_id"]))
        exercise_id = uuid.UUID(str(payload["exercise_id"]))
        draft = await db.scalar(select(ExerciseDraft).where(
            ExerciseDraft.student_id == student_id,
            ExerciseDraft.exercise_id == exercise_id,
            ExerciseDraft.org_id == lesson.org_id,
        ))
        if draft is None:
            raise ValueError("draft not found")
        answers, source_code = draft.answers, draft.source_code
    else:
        raise ValueError("solution payload needs submission_id or student_id+exercise_id")

    student_name = None
    if not anonymous and student_id is not None:
        student = await db.get(User, student_id)
        student_name = student.full_name if student else None

    built = {
        "exercise_id": str(exercise_id) if exercise_id else None,
        "answers": answers,
        "source_code": source_code,
        "student_name": student_name,
        "anonymous": anonymous,
    }
    if len(json.dumps(built, ensure_ascii=False)) > SOLUTION_PAYLOAD_CAP:
        built["source_code"] = (source_code or "")[: SOLUTION_PAYLOAD_CAP // 2]
        if len(json.dumps(built, ensure_ascii=False)) > SOLUTION_PAYLOAD_CAP:
            raise ValueError("solution too large to broadcast")
    return built


async def set_scene(db: AsyncSession, lesson: LiveLesson, scene: dict) -> LiveLesson:
    if scene["type"] == "solution":
        scene = {**scene, "payload": await _solution_payload(db, lesson, scene["payload"])}
    lesson.current_scene = scene
    r = realtime.get_redis()
    await r.set(realtime.scene_key(lesson.id), json.dumps(scene))
    await r.rpush(
        realtime.scene_log_key(lesson.id),
        json.dumps({"type": scene["type"],
                    "at": datetime.now(timezone.utc).isoformat()}),
    )
    await realtime.publish(lesson.id, "all", "scene_changed", scene)
    return lesson


async def set_follow_mode(db: AsyncSession, lesson: LiveLesson, follow_mode: str) -> LiveLesson:
    lesson.follow_mode = follow_mode
    await realtime.publish(lesson.id, "all", "settings_changed", {"follow_mode": follow_mode})
    return lesson
```

- [ ] **Step 4: Router endpoints** (append to router.py; both use the same teacher-guard shape as `end`)

```python
from app.live_lessons.schemas import SceneRequest, SettingsRequest


async def _teacher_lesson(lesson_id, user, db) -> "LiveLesson":
    try:
        lesson, is_teacher = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    if not is_teacher:
        raise HTTPException(status_code=403, detail="forbidden")
    if lesson.status != "active":
        raise HTTPException(status_code=409, detail="lesson ended")
    return lesson


@router.patch("/{lesson_id}/scene", response_model=LiveLessonResponse)
async def set_scene_endpoint(
    lesson_id: uuid.UUID,
    data: SceneRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await _teacher_lesson(lesson_id, user, db)
    try:
        lesson = await service.set_scene(db, lesson, data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return LiveLessonResponse.model_validate(lesson)


@router.patch("/{lesson_id}/settings", response_model=LiveLessonResponse)
async def set_settings_endpoint(
    lesson_id: uuid.UUID,
    data: SettingsRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await _teacher_lesson(lesson_id, user, db)
    lesson = await service.set_follow_mode(db, lesson, data.follow_mode)
    return LiveLessonResponse.model_validate(lesson)
```

- [ ] **Step 5: Run tests** — `pytest tests/test_live_lessons.py -v` → all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/live_lessons backend/tests/test_live_lessons.py
git commit -m "feat(live-lessons): scene switching with solution snapshot, follow-mode settings"
```

---

### Task 6: Boards (create / delta / fetch)

**Files:**
- Modify: `backend/app/live_lessons/service.py`
- Modify: `backend/app/live_lessons/router.py`
- Test: `backend/tests/test_live_lessons.py` (append)

- [ ] **Step 1: Append failing tests**

```python
async def test_board_delta_flow(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    board = (await client.post(f"/api/v1/live-lessons/{lesson_id}/boards",
                               json={"kind": "board"},
                               headers=auth_header(teacher))).json()
    el = {"id": "el1", "type": "rectangle", "x": 0, "y": 0}
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/boards/{board['id']}",
        json={"updated": [el], "deleted": [], "version": 1},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    # student fetches full scene
    got = (await client.get(f"/api/v1/live-lessons/{lesson_id}/boards/{board['id']}",
                            headers=auth_header(student))).json()
    assert got["version"] == 1
    assert got["scene"]["elements"] == [el]
    # delete the element
    await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/boards/{board['id']}",
        json={"updated": [], "deleted": ["el1"], "version": 2},
        headers=auth_header(teacher),
    )
    got2 = (await client.get(f"/api/v1/live-lessons/{lesson_id}/boards/{board['id']}",
                             headers=auth_header(student))).json()
    assert got2["scene"]["elements"] == []


async def test_board_delta_payload_cap(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    board = (await client.post(f"/api/v1/live-lessons/{lesson_id}/boards",
                               json={"kind": "board"},
                               headers=auth_header(teacher))).json()
    huge = {"id": "big", "type": "freedraw", "points": "x" * 300_000}
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/boards/{board['id']}",
        json={"updated": [huge], "deleted": [], "version": 1},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 413
```

- [ ] **Step 2: Run — verify failure** (405/404 on board routes)

- [ ] **Step 3: Service**

```python
BOARD_DELTA_CAP = 200_000  # bytes of JSON per PATCH


async def create_board(
    db: AsyncSession, lesson: LiveLesson, kind: str, material_ref: str | None
) -> LessonBoard:
    board = LessonBoard(live_lesson_id=lesson.id, kind=kind,
                        scene={"elements": [], "appState": {}},
                        material_ref=material_ref)
    db.add(board)
    await db.flush()
    return board


async def get_board(db: AsyncSession, lesson: LiveLesson, board_id: uuid.UUID) -> LessonBoard:
    board = await db.scalar(select(LessonBoard).where(
        LessonBoard.id == board_id, LessonBoard.live_lesson_id == lesson.id
    ))
    if board is None:
        raise ValueError("board not found")
    return board


async def apply_board_delta(
    db: AsyncSession, lesson: LiveLesson, board: LessonBoard,
    updated: list[dict], deleted: list[str], version: int,
) -> LessonBoard:
    if len(json.dumps({"updated": updated, "deleted": deleted}, ensure_ascii=False)) > BOARD_DELTA_CAP:
        raise OverflowError("delta too large")
    elements = {e["id"]: e for e in board.scene.get("elements", []) if "id" in e}
    for e in updated:
        if "id" in e:
            elements[e["id"]] = e
    for el_id in deleted:
        elements.pop(el_id, None)
    # reassign (not mutate) so SQLAlchemy sees the JSONB change
    board.scene = {**board.scene, "elements": list(elements.values())}
    board.version = version
    await realtime.publish(lesson.id, "all", "board_delta",
                           {"board_id": str(board.id), "updated": updated,
                            "deleted": deleted, "version": version})
    return board
```

- [ ] **Step 4: Router** (append; imports: `BoardCreateRequest, BoardDeltaRequest, BoardResponse`)

```python
@router.post("/{lesson_id}/boards", response_model=BoardResponse, status_code=201)
async def create_board_endpoint(
    lesson_id: uuid.UUID,
    data: BoardCreateRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await _teacher_lesson(lesson_id, user, db)
    board = await service.create_board(db, lesson, data.kind, data.material_ref)
    return BoardResponse.model_validate(board)


@router.patch("/{lesson_id}/boards/{board_id}", response_model=BoardResponse)
async def board_delta_endpoint(
    lesson_id: uuid.UUID,
    board_id: uuid.UUID,
    data: BoardDeltaRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await _teacher_lesson(lesson_id, user, db)
    try:
        board = await service.get_board(db, lesson, board_id)
        board = await service.apply_board_delta(
            db, lesson, board, data.updated, data.deleted, data.version
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="board not found")
    except OverflowError:
        raise HTTPException(status_code=413, detail="delta too large")
    return BoardResponse.model_validate(board)


@router.get("/{lesson_id}/boards/{board_id}", response_model=BoardResponse)
async def get_board_endpoint(
    lesson_id: uuid.UUID,
    board_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        lesson, _ = await service.get_lesson_for_user(db, lesson_id, user)
        board = await service.get_board(db, lesson, board_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    return BoardResponse.model_validate(board)
```

Note: board GET works for ended lessons too (post-lesson review) — `get_lesson_for_user` doesn't check status. Delta/create go through `_teacher_lesson`, which 409s on ended.

- [ ] **Step 5: Run tests** — all PASS. **Step 6: Commit**

```bash
git add backend/app/live_lessons backend/tests/test_live_lessons.py
git commit -m "feat(live-lessons): boards with delta protocol + payload cap"
```

---

### Task 7: Heartbeat / presence / roster / list

**Files:**
- Modify: `backend/app/live_lessons/service.py`
- Modify: `backend/app/live_lessons/router.py`
- Test: `backend/tests/test_live_lessons.py` (append)

- [ ] **Step 1: Append failing tests**

```python
async def test_heartbeat_and_roster(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    resp = await client.post(f"/api/v1/live-lessons/{lesson_id}/heartbeat",
                             json={"current_view": "scene"},
                             headers=auth_header(student))
    assert resp.status_code == 204
    roster = (await client.get(f"/api/v1/live-lessons/{lesson_id}/roster",
                               headers=auth_header(teacher))).json()
    me = next(m for m in roster["members"] if m["id"] == str(student.id))
    assert me["online"] is True
    assert me["current_view"] == "scene"


async def test_active_endpoint_for_student(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    resp = await client.get("/api/v1/live-lessons/active", headers=auth_header(student))
    assert resp.json()["lesson_id"] == lesson_id


async def test_list_lessons_for_student(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    await client.post(f"/api/v1/live-lessons/{lesson_id}/end", headers=auth_header(teacher))
    resp = await client.get("/api/v1/live-lessons", headers=auth_header(student))
    assert resp.status_code == 200
    assert [item["id"] for item in resp.json()] == [lesson_id]
```

- [ ] **Step 2: Run — verify failure**

- [ ] **Step 3: Service**

```python
async def heartbeat(lesson: LiveLesson, user: User, current_view: str,
                    exercise_id: uuid.UUID | None) -> None:
    r = realtime.get_redis()
    if user.id == lesson.teacher_id:
        await r.set(realtime.teacher_seen_key(lesson.id), "1",
                    ex=realtime.TEACHER_STALE_SECONDS)
        return
    key = realtime.presence_key(lesson.id, user.id)
    prev = await r.get(key)
    value = json.dumps({"view": current_view,
                        "exercise_id": str(exercise_id) if exercise_id else None})
    await r.set(key, value, ex=realtime.PRESENCE_TTL)
    await r.set(realtime.active_lesson_key(user.id), str(lesson.id),
                ex=realtime.PRESENCE_TTL)
    await r.hincrby(realtime.attendance_key(lesson.id), str(user.id), 1)
    if prev != value:  # first beat or view/task changed -> notify teacher
        await realtime.publish(lesson.id, "teacher", "presence",
                               {"student_id": str(user.id), "online": True,
                                **json.loads(value)})


async def roster(db: AsyncSession, lesson: LiveLesson) -> dict:
    r = realtime.get_redis()
    rows = await db.execute(
        select(User.id, User.full_name)
        .join(StudentGroupMember, StudentGroupMember.user_id == User.id)
        .where(StudentGroupMember.group_id == lesson.group_id)
        .order_by(User.full_name)
    )
    signals = await r.hgetall(realtime.signals_key(lesson.id))
    members = []
    for uid, name in rows:
        presence_raw = await r.get(realtime.presence_key(lesson.id, uid))
        presence = json.loads(presence_raw) if presence_raw else None
        members.append({
            "id": str(uid),
            "name": name,
            "online": presence is not None,
            "current_view": presence["view"] if presence else None,
            "exercise_id": presence["exercise_id"] if presence else None,
            "signal": signals.get(str(uid)),
        })
    return {"members": members}
```

- [ ] **Step 4: Router** (append; import `HeartbeatRequest`; note `Response` import from fastapi for 204)

```python
from fastapi import Response


@router.post("/{lesson_id}/heartbeat", status_code=204)
async def heartbeat_endpoint(
    lesson_id: uuid.UUID,
    data: HeartbeatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        lesson, _ = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    if lesson.status != "active":
        raise HTTPException(status_code=409, detail="lesson ended")
    await service.heartbeat(lesson, user, data.current_view, data.exercise_id)
    return Response(status_code=204)


@router.get("/{lesson_id}/roster")
async def roster_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    try:
        lesson, is_teacher = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    if not is_teacher:
        raise HTTPException(status_code=403, detail="forbidden")
    return await service.roster(db, lesson)


@router.get("", response_model=list[LiveLessonResponse])
async def list_lessons_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(LiveLesson).where(LiveLesson.org_id == user.org_id)
    if user.role == UserRole.student:
        q = q.join(StudentGroupMember,
                   StudentGroupMember.group_id == LiveLesson.group_id
                   ).where(StudentGroupMember.user_id == user.id)
    elif user.role == UserRole.teacher:
        q = q.where(LiveLesson.teacher_id == user.id)
    q = q.order_by(LiveLesson.created_at.desc()).limit(50)
    rows = (await db.execute(q)).scalars().all()
    return [LiveLessonResponse.model_validate(x) for x in rows]
```

Add `from app.admin.models import StudentGroupMember` to router imports. Declare `GET ""` list route AFTER `POST ""` — order among different methods doesn't conflict; the only ordering constraint stays `/active` before `/{lesson_id}`.

- [ ] **Step 5: Run tests** — all PASS. **Step 6: Commit**

```bash
git add backend/app/live_lessons backend/tests/test_live_lessons.py
git commit -m "feat(live-lessons): heartbeat/presence, roster, lesson list"
```

---

### Task 8: Signals + polls

**Files:**
- Modify: `backend/app/live_lessons/service.py`
- Modify: `backend/app/live_lessons/router.py`
- Test: `backend/tests/test_live_lessons.py` (append)

- [ ] **Step 1: Append failing tests**

```python
async def test_signal_set_and_clear(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    resp = await client.post(f"/api/v1/live-lessons/{lesson_id}/signals",
                             json={"type": "hand"}, headers=auth_header(student))
    assert resp.status_code == 204
    state = (await client.get(f"/api/v1/live-lessons/{lesson_id}",
                              headers=auth_header(student))).json()
    assert state["my_signal"] == "hand"
    resp = await client.delete(f"/api/v1/live-lessons/{lesson_id}/signals",
                               headers=auth_header(student))
    assert resp.status_code == 204
    state = (await client.get(f"/api/v1/live-lessons/{lesson_id}",
                              headers=auth_header(student))).json()
    assert state["my_signal"] is None


async def test_poll_lifecycle(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    poll = (await client.post(f"/api/v1/live-lessons/{lesson_id}/polls",
                              json={"question": "2+2?", "options": ["3", "4"]},
                              headers=auth_header(teacher))).json()
    assert poll["question"] == "2+2?"
    resp = await client.post(f"/api/v1/live-lessons/{lesson_id}/polls/vote",
                             json={"option": 1}, headers=auth_header(student))
    assert resp.status_code == 204
    closed = (await client.post(f"/api/v1/live-lessons/{lesson_id}/polls/close",
                                headers=auth_header(teacher))).json()
    assert closed["counts"] == [0, 1]
    # poll gone from state
    state = (await client.get(f"/api/v1/live-lessons/{lesson_id}",
                              headers=auth_header(student))).json()
    assert state["active_poll"] is None
```

Design note: one active poll per lesson (`lesson:{id}:poll`), so vote/close need no poll id — YAGNI on multiple concurrent polls.

- [ ] **Step 2: Run — verify failure**

- [ ] **Step 3: Service**

```python
async def set_signal(lesson: LiveLesson, user: User, signal_type: str | None) -> None:
    r = realtime.get_redis()
    key = realtime.signals_key(lesson.id)
    if signal_type is None:
        await r.hdel(key, str(user.id))
    else:
        await r.hset(key, str(user.id), signal_type)
    await realtime.publish(lesson.id, "teacher", "signal",
                           {"student_id": str(user.id), "type": signal_type,
                            "on": signal_type is not None})


async def start_poll(lesson: LiveLesson, question: str, options: list[str]) -> dict:
    r = realtime.get_redis()
    poll = {"question": question, "options": options}
    await r.set(realtime.poll_key(lesson.id), json.dumps(poll))
    await r.delete(realtime.poll_votes_key(lesson.id))
    await realtime.publish(lesson.id, "all", "poll_started", poll)
    return poll


async def vote_poll(lesson: LiveLesson, user: User, option: int) -> None:
    r = realtime.get_redis()
    poll_raw = await r.get(realtime.poll_key(lesson.id))
    if poll_raw is None:
        raise ValueError("no active poll")
    poll = json.loads(poll_raw)
    if option >= len(poll["options"]):
        raise ValueError("bad option")
    await r.hset(realtime.poll_votes_key(lesson.id), str(user.id), str(option))
    votes = await r.hgetall(realtime.poll_votes_key(lesson.id))
    counts = [0] * len(poll["options"])
    for v in votes.values():
        counts[int(v)] += 1
    await realtime.publish(lesson.id, "teacher", "poll_progress", {"counts": counts})


async def close_poll(lesson: LiveLesson) -> dict:
    r = realtime.get_redis()
    poll_raw = await r.get(realtime.poll_key(lesson.id))
    if poll_raw is None:
        raise ValueError("no active poll")
    poll = json.loads(poll_raw)
    votes = await r.hgetall(realtime.poll_votes_key(lesson.id))
    counts = [0] * len(poll["options"])
    for v in votes.values():
        counts[int(v)] += 1
    result = {**poll, "counts": counts}
    await r.delete(realtime.poll_key(lesson.id), realtime.poll_votes_key(lesson.id))
    await r.rpush(realtime.scene_log_key(lesson.id),
                  json.dumps({"type": "poll", "poll": result,
                              "at": datetime.now(timezone.utc).isoformat()}))
    await realtime.publish(lesson.id, "all", "poll_closed", result)
    return result
```

(Closed polls land in `scene_log`, so they surface in `summary["scenes"]` at finalize — no extra storage.)

- [ ] **Step 4: Router** (append; imports `SignalRequest, PollCreateRequest, VoteRequest`; signals stay under slowapi default — no decorator needed since default_limits is empty, but add an explicit modest limit against spam)

```python
from fastapi import Request
from app.common.rate_limit import limiter


@router.post("/{lesson_id}/signals", status_code=204)
@limiter.limit("20/minute")
async def set_signal_endpoint(
    request: Request,
    lesson_id: uuid.UUID,
    data: SignalRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        lesson, _ = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    if lesson.status != "active":
        raise HTTPException(status_code=409, detail="lesson ended")
    await service.set_signal(lesson, user, data.type)
    return Response(status_code=204)


@router.delete("/{lesson_id}/signals", status_code=204)
async def clear_signal_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        lesson, _ = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    await service.set_signal(lesson, user, None)
    return Response(status_code=204)


@router.post("/{lesson_id}/polls")
async def start_poll_endpoint(
    lesson_id: uuid.UUID,
    data: PollCreateRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await _teacher_lesson(lesson_id, user, db)
    return await service.start_poll(lesson, data.question, data.options)


@router.post("/{lesson_id}/polls/vote", status_code=204)
async def vote_poll_endpoint(
    lesson_id: uuid.UUID,
    data: VoteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        lesson, _ = await service.get_lesson_for_user(db, lesson_id, user)
        await service.vote_poll(lesson, user, data.option)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    return Response(status_code=204)


@router.post("/{lesson_id}/polls/close")
async def close_poll_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await _teacher_lesson(lesson_id, user, db)
    try:
        return await service.close_poll(lesson)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
```

- [ ] **Step 5: Run tests** — all PASS. **Step 6: Commit**

```bash
git add backend/app/live_lessons backend/tests/test_live_lessons.py
git commit -m "feat(live-lessons): student signals + single-active-poll lifecycle"
```

---

### Task 9: SSE endpoint

**Files:**
- Modify: `backend/app/live_lessons/router.py`
- Test: `backend/tests/test_live_sse.py`

⚠️ **Do NOT hold a DB session for the stream's lifetime.** 16 open streams = 16 checked-out pool connections = pool exhaustion on prod. Auth with a short-lived manual session, close it, then stream.

- [ ] **Step 1: Write failing test**

`backend/tests/test_live_sse.py`:

```python
import asyncio
import json
import uuid

from httpx import AsyncClient

from app.live_lessons import realtime
from tests.conftest import auth_header
from tests.test_live_lessons import make_group


async def test_sse_delivers_scene_event_with_role_filter(client: AsyncClient, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]

    received: list[str] = []

    async def listen():
        async with client.stream(
            "GET", f"/api/v1/live-lessons/{lesson_id}/events",
            headers=auth_header(student),
        ) as resp:
            assert resp.status_code == 200
            assert resp.headers["content-type"].startswith("text/event-stream")
            async for line in resp.aiter_lines():
                received.append(line)
                if line.startswith("data:"):
                    break

    task = asyncio.create_task(listen())
    await asyncio.sleep(0.1)  # let the stream subscribe
    await realtime.publish(uuid.UUID(lesson_id), "all", "scene_changed", {"type": "board"})
    # teacher-only event must NOT reach the student before the "all" one already did
    await asyncio.wait_for(task, timeout=3)

    data_lines = [ln for ln in received if ln.startswith("data:")]
    assert json.loads(data_lines[0][5:]) == {"type": "board"}
    event_lines = [ln for ln in received if ln.startswith("event:")]
    assert event_lines[0] == "event: scene_changed"


async def test_sse_forbidden_for_outsider(client, db, org, teacher, student, admin2):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    # admin2 belongs to org2 -> 404 (org isolation)
    async with client.stream("GET", f"/api/v1/live-lessons/{lesson_id}/events",
                             headers=auth_header(admin2)) as resp:
        assert resp.status_code == 404
```

- [ ] **Step 2: Run — verify failure** (404: route missing)

- [ ] **Step 3: Implement** (append to router.py)

```python
import asyncio
import json as _json

from fastapi.responses import StreamingResponse


@router.get("/{lesson_id}/events")
async def lesson_events_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Authorize with the request-scoped session, capture what we need,
    # then never touch `db` again inside the generator (it may be closed
    # long before the stream ends — and must not be held open).
    try:
        lesson, is_teacher = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    if lesson.status != "active":
        raise HTTPException(status_code=409, detail="lesson ended")

    user_id = str(user.id)

    def allowed(audience: str) -> bool:
        if audience == "all":
            return True
        if audience == "teacher":
            return is_teacher
        return audience == f"student:{user_id}"

    async def gen():
        sub = realtime.subscribe(lesson_id)
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(anext(sub), timeout=15)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                    continue
                except StopAsyncIteration:
                    break
                if not allowed(msg["audience"]):
                    continue
                yield f"event: {msg['event']}\ndata: {_json.dumps(msg['data'], ensure_ascii=False)}\n\n"
                if msg["event"] == "lesson_ended":
                    break
        finally:
            await sub.aclose()

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx: don't buffer this response
        },
    )
```

- [ ] **Step 4: Run tests** — `pytest tests/test_live_sse.py -v` → 2 PASS. If the first test hangs, check fakeredis pubsub `listen()` delivers (it does in fakeredis>=2.26); the wait_for timeout guards the await.

- [ ] **Step 5: Commit**

```bash
git add backend/app/live_lessons/router.py backend/tests/test_live_sse.py
git commit -m "feat(live-lessons): SSE stream with audience filter, keepalive, no held DB session"
```

---

### Task 10: Exercise drafts (in exercises module) with active-lesson gate

**Files:**
- Modify: `backend/app/exercises/router.py`
- Test: `backend/tests/test_live_drafts.py`

- [ ] **Step 1: Write failing tests**

`backend/tests/test_live_drafts.py`:

```python
from httpx import AsyncClient

from app.live_lessons import realtime
from tests.conftest import auth_header, make_course, make_exercise, make_lesson, make_module
from tests.test_live_lessons import make_group


async def _setup_exercise(db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson_row = await make_lesson(db, module.id)
    return await make_exercise(db, lesson_row.id, org.id)


async def test_draft_noop_without_active_lesson(client: AsyncClient, db, org, teacher, student):
    ex = await _setup_exercise(db, org, teacher)
    resp = await client.post(f"/api/v1/exercises/{ex.id}/draft",
                             json={"answers": {"q": "a"}},
                             headers=auth_header(student))
    assert resp.status_code == 204
    # gated: nothing stored
    got = await client.get(f"/api/v1/exercises/{ex.id}/drafts/{student.id}",
                           headers=auth_header(teacher))
    assert got.status_code == 404


async def test_draft_saved_during_lesson_and_304(client, db, org, teacher, student):
    ex = await _setup_exercise(db, org, teacher)
    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    # heartbeat sets the active_lesson gate key
    await client.post(f"/api/v1/live-lessons/{lesson_id}/heartbeat",
                      json={"current_view": "scene"}, headers=auth_header(student))
    resp = await client.post(f"/api/v1/exercises/{ex.id}/draft",
                             json={"answers": {"q": "a"}},
                             headers=auth_header(student))
    assert resp.status_code == 204
    got = await client.get(f"/api/v1/exercises/{ex.id}/drafts/{student.id}",
                           headers=auth_header(teacher))
    assert got.status_code == 200
    body = got.json()
    assert body["answers"] == {"q": "a"}
    etag = got.headers["etag"]
    # unchanged -> 304
    got2 = await client.get(f"/api/v1/exercises/{ex.id}/drafts/{student.id}",
                            headers={**auth_header(teacher), "If-None-Match": etag})
    assert got2.status_code == 304


async def test_student_cannot_read_others_draft(client, db, org, teacher, student):
    ex = await _setup_exercise(db, org, teacher)
    resp = await client.get(f"/api/v1/exercises/{ex.id}/drafts/{teacher.id}",
                            headers=auth_header(student))
    assert resp.status_code == 403
```

(Factory signatures verified — see the note in Task 5.)

- [ ] **Step 2: Run — verify failure**

- [ ] **Step 3: Implement in `backend/app/exercises/router.py`** (append at the end; keep exercises' existing import style)

```python
from app.live_lessons import realtime as live_realtime
from app.live_lessons.models import ExerciseDraft
from app.live_lessons.schemas import DraftRequest


@router.post("/{exercise_id}/draft", status_code=204)
async def save_draft_endpoint(
    exercise_id: uuid.UUID,
    data: DraftRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Server-side gate: drafts are only stored while the student is in an
    # active live lesson (keeps this write-path lesson-bounded on prod).
    active = await live_realtime.get_redis().get(live_realtime.active_lesson_key(user.id))
    if active is None:
        return Response(status_code=204)  # silent no-op
    draft = await db.scalar(select(ExerciseDraft).where(
        ExerciseDraft.exercise_id == exercise_id,
        ExerciseDraft.student_id == user.id,
    ))
    if draft is None:
        draft = ExerciseDraft(org_id=user.org_id, exercise_id=exercise_id,
                              student_id=user.id)
        db.add(draft)
    draft.answers = data.answers
    draft.source_code = data.source_code
    await db.flush()
    return Response(status_code=204)


@router.get("/{exercise_id}/drafts/{student_id}")
async def get_draft_endpoint(
    exercise_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    draft = await db.scalar(select(ExerciseDraft).where(
        ExerciseDraft.exercise_id == exercise_id,
        ExerciseDraft.student_id == student_id,
        ExerciseDraft.org_id == user.org_id,
    ))
    if draft is None:
        raise HTTPException(status_code=404, detail="no draft")
    etag = f'"{draft.updated_at.isoformat()}"'
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304)
    return JSONResponse(
        content={
            "exercise_id": str(draft.exercise_id),
            "student_id": str(draft.student_id),
            "answers": draft.answers,
            "source_code": draft.source_code,
            "updated_at": draft.updated_at.isoformat(),
        },
        headers={"ETag": etag},
    )
```

Check the top of `exercises/router.py` for already-present imports (`uuid`, `select`, `Depends`, `Response`, `JSONResponse`, `Request`, `require_role`) and add only the missing ones.

- [ ] **Step 4: Run tests** — 3 PASS. **Step 5: Commit**

```bash
git add backend/app/exercises/router.py backend/tests/test_live_drafts.py
git commit -m "feat(live-lessons): exercise drafts with active-lesson gate + conditional GET"
```

---

### Task 11: Submit hook + progress grid

**Files:**
- Modify: `backend/app/exercises/router.py` (submit endpoint, ~line 250)
- Modify: `backend/app/live_lessons/router.py` (progress endpoint)
- Test: `backend/tests/test_live_lessons.py` (append)

- [ ] **Step 1: Append failing test**

```python
async def test_submission_event_published_and_progress(client, db, org, teacher, student):
    import asyncio
    import uuid as _uuid

    from app.live_lessons import realtime
    from tests.conftest import make_course, make_exercise, make_lesson, make_module

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson_row = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson_row.id, org.id)

    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    await client.post(f"/api/v1/live-lessons/{lesson_id}/heartbeat",
                      json={"current_view": "scene"}, headers=auth_header(student))

    events = []

    async def listen():
        async for msg in realtime.subscribe(_uuid.UUID(lesson_id)):
            if msg["event"] == "submission":
                events.append(msg)
                break

    task = asyncio.create_task(listen())
    await asyncio.sleep(0.05)
    resp = await client.post(f"/api/v1/exercises/{ex.id}/submit",
                             json={"answers": {}},
                             headers=auth_header(student))
    assert resp.status_code in (200, 201)
    await asyncio.wait_for(task, timeout=2)
    assert events[0]["data"]["student_id"] == str(student.id)

    grid = (await client.get(
        f"/api/v1/live-lessons/{lesson_id}/progress?exercise_id={ex.id}",
        headers=auth_header(teacher))).json()
    row = next(m for m in grid["students"] if m["id"] == str(student.id))
    assert row["submitted"] is True
```

(Adjust the submit body to `SubmitExerciseRequest`'s actual required fields — check `backend/app/exercises/schemas.py`; quiz-type exercises accept `{"answers": {...}}`-shaped payloads.)

- [ ] **Step 2: Run — verify failure**

- [ ] **Step 3: Submit hook** — in `backend/app/exercises/router.py`, inside `submit_exercise_endpoint` (~line 250), right after `submission = await submit_exercise(...)` returns:

```python
    # live-lesson hook: if the student is in an active lesson, notify its teacher panel
    try:
        from app.live_lessons import realtime as live_realtime
        active = await live_realtime.get_redis().get(
            live_realtime.active_lesson_key(user.id)
        )
        if active:
            await live_realtime.publish(
                uuid.UUID(active), "teacher", "submission",
                {"student_id": str(user.id), "exercise_id": str(exercise_id),
                 "passed": submission.passed, "score": submission.score},
            )
    except Exception:  # noqa: BLE001 — a broken hook must never fail a submit
        pass
```

- [ ] **Step 4: Progress endpoint** — append to `live_lessons/router.py`:

```python
@router.get("/{lesson_id}/progress")
async def progress_endpoint(
    lesson_id: uuid.UUID,
    exercise_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    from app.exercises.models import ExerciseSubmission
    from app.live_lessons.models import ExerciseDraft

    try:
        lesson, is_teacher = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    if not is_teacher:
        raise HTTPException(status_code=403, detail="forbidden")

    member_rows = await db.execute(
        select(User.id, User.full_name)
        .join(StudentGroupMember, StudentGroupMember.user_id == User.id)
        .where(StudentGroupMember.group_id == lesson.group_id)
        .order_by(User.full_name)
    )
    subs = (await db.execute(
        select(ExerciseSubmission)
        .where(ExerciseSubmission.exercise_id == exercise_id)
        .order_by(ExerciseSubmission.submitted_at.desc())
    )).scalars().all()
    latest = {}
    for s in subs:
        latest.setdefault(str(s.student_id), s)
    drafts = (await db.execute(
        select(ExerciseDraft).where(ExerciseDraft.exercise_id == exercise_id)
    )).scalars().all()
    draft_at = {str(d.student_id): d.updated_at.isoformat() for d in drafts}

    students = []
    for uid, name in member_rows:
        sub = latest.get(str(uid))
        students.append({
            "id": str(uid),
            "name": name,
            "submitted": sub is not None,
            "passed": sub.passed if sub else None,
            "score": sub.score if sub else None,
            "attempts": sum(1 for s in subs if str(s.student_id) == str(uid)),
            "draft_updated_at": draft_at.get(str(uid)),
        })
    return {"students": students}
```

- [ ] **Step 5: Run tests** — PASS. **Step 6: Commit**

```bash
git add backend/app/exercises/router.py backend/app/live_lessons/router.py backend/tests/test_live_lessons.py
git commit -m "feat(live-lessons): submit hook publishes to lesson channel + teacher progress grid"
```

---

### Task 12: Teacher→student hint messages + full suite

**Files:**
- Modify: `backend/app/live_lessons/service.py`, `router.py`
- Test: `backend/tests/test_live_lessons.py` (append)

- [ ] **Step 1: Append failing test**

```python
async def test_message_creates_notification(client, db, org, teacher, student):
    from sqlalchemy import select as sa_select
    from app.notifications.models import Notification

    g = await make_group(db, org, teacher, [student])
    lesson_id = (await client.post("/api/v1/live-lessons", json={"group_id": str(g.id)},
                                   headers=auth_header(teacher))).json()["id"]
    resp = await client.post(f"/api/v1/live-lessons/{lesson_id}/messages",
                             json={"student_id": str(student.id), "text": "Смотри на условие"},
                             headers=auth_header(teacher))
    assert resp.status_code == 204
    notes = (await db.execute(
        sa_select(Notification).where(Notification.user_id == student.id)
    )).scalars().all()
    assert any("Смотри на условие" in (n.body or "") for n in notes)
```

- [ ] **Step 2: Run — verify failure. Step 3: Service + router**

service.py:

```python
async def send_hint(db: AsyncSession, lesson: LiveLesson, student_id: uuid.UUID, text: str) -> None:
    member = await db.scalar(select(StudentGroupMember).where(
        StudentGroupMember.group_id == lesson.group_id,
        StudentGroupMember.user_id == student_id,
    ))
    if member is None:
        raise ValueError("student not in lesson group")
    await realtime.publish(lesson.id, f"student:{student_id}", "message", {"text": text})
    await create_notification(db, user_id=student_id, title="Подсказка от преподавателя",
                              body=text, link=f"/lesson/{lesson.id}")
```

router.py (append; import `MessageRequest`):

```python
@router.post("/{lesson_id}/messages", status_code=204)
async def send_message_endpoint(
    lesson_id: uuid.UUID,
    data: MessageRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await _teacher_lesson(lesson_id, user, db)
    try:
        await service.send_hint(db, lesson, data.student_id, data.text)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return Response(status_code=204)
```

- [ ] **Step 4: Run the WHOLE backend suite**

Run: `cd backend && pytest tests/ -q`
Expected: everything green (this catches conftest/model-registration regressions in other modules).

- [ ] **Step 5: Ruff**

Run: `cd backend && ruff check app/live_lessons tests/test_live_lessons.py tests/test_live_sse.py tests/test_live_drafts.py tests/test_live_realtime.py && ruff format --check app/live_lessons`
Expected: clean (fix if not).

- [ ] **Step 6: Commit**

```bash
git add backend/app/live_lessons backend/tests/test_live_lessons.py
git commit -m "feat(live-lessons): targeted hints with notification fallback"
```

---

## Deferred to Plan 2 (frontend) / explicitly out of this plan

- All UI (teacher screen, student screen, projector window) — Plan 2.
- ClassSession auto-create on start (v1: `class_session_id` accepted if the journal flow passes it; auto-create can ride in a follow-up — the column and linkage exist).
- Board→course-material attach button (needs course content editing flow — Plan 2 decides the UX, backend endpoint added then).
- Jitsi, classroomscreen widgets, collaborative board, global draft autosave — out of v1 per spec.

## Plan self-review notes (done at write time)

- Spec coverage: lifecycle §6 ✓ (T4), scene+solution §4/§6 ✓ (T5), boards §8 ✓ (T6), presence/roster/active/list §6/§9 ✓ (T7), signals/polls §7 ✓ (T8), SSE §7 ✓ (T9), drafts §5/§6 ✓ (T10), submit hook + progress §7/§6 ✓ (T11), hints §6 ✓ (T12), attendance/journal §10 ✓ (T4 finalize), post-lesson review access §10 ✓ (state/list/board GET allow ended lessons).
- Known simplifications: one active poll per lesson; attendance = heartbeat-count × 5s; poll history only via scene_log; `GET /active` for teacher ignores admin-run lessons of other teachers (admins use the group page entry).
- Type consistency: envelope `{audience, event, data}` used in realtime.py, SSE gen, and all publish calls; key helpers referenced only via `realtime.*`.



