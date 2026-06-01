"""
Comprehensive test fixtures for LMS.

Uses transaction rollback pattern: each test runs inside a DB transaction
that is rolled back after the test, so tests don't pollute each other.
"""
import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

import app.admin.models  # noqa
import app.analytics.models  # noqa
import app.assessments.models  # noqa
import app.assignments.models  # noqa
import app.attendance.models  # noqa

# Import all models so metadata knows about them
import app.auth.models  # noqa
import app.billing.models  # noqa
import app.calendar.models  # noqa
import app.certificates.models  # noqa
import app.courses.models  # noqa
import app.donations.models  # noqa
import app.exercises.models  # noqa
import app.feedback.models  # noqa
import app.gamification.models  # noqa
import app.journal.models  # noqa
import app.learning_paths.models  # noqa
import app.meetings.models  # noqa
import app.metered_billing.models  # noqa
import app.notifications.models  # noqa
import app.peer_review.models  # noqa
import app.progress.models  # noqa
import app.recording.models  # noqa
import app.rooms.models  # noqa
import app.sandbox.models  # noqa
import app.schedule.models  # noqa
import app.scorm.models  # noqa
import app.skills.models  # noqa
import app.submissions.models  # noqa
import app.team_projects.models  # noqa
import app.waitlist.models  # noqa
import app.webhooks.models  # noqa
from app.auth.models import Organization, User, UserRole
from app.auth.security import create_access_token, hash_password
from app.config import settings
from app.db.base import Base
from app.main import app as fastapi_app

TEST_DB_URL = settings.get_database_url()

_tables_created = False


# ---------------------------------------------------------------------------
# Rate limiter state isolation
# ---------------------------------------------------------------------------
# slowapi's `memory://` storage is a single per-process dict that is NOT
# cleared between tests. Without this fixture the first test that hits a
# rate-limited endpoint poisons every subsequent test in the file because
# the counter keeps climbing across requests. Reset the limiter before
# every test so each test starts with a clean budget.
@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    try:
        from app.common.rate_limit import limiter

        limiter.reset()
    except Exception:
        pass
    yield


# ---------------------------------------------------------------------------
# Per-test DB session with rollback
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def db():
    """
    Provide an async session wrapped in a transaction that rolls back.
    Creates the engine fresh each test to avoid event loop issues.
    """
    global _tables_created
    engine = create_async_engine(TEST_DB_URL, echo=False)

    if not _tables_created:
        async with engine.begin() as conn:
            # pgvector extension required for knowledge_entries.embedding (VECTOR(1024)).
            # CI uses pgvector/pgvector:pg16; this is a no-op when already installed.
            from sqlalchemy import text as _text
            await conn.execute(_text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.run_sync(Base.metadata.create_all)
            # Phase B group-centric scheduling: create_all does NOT add columns
            # to a pre-existing student_groups/schedule_slots/class_sessions
            # table in a persistent local test DB. Mirror the _run_setup +
            # migration ALTERs idempotently so both fresh (CI) and reused
            # (local) databases carry the new columns.
            for _stmt in (
                "ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id) ON DELETE SET NULL",
                "ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES users(id) ON DELETE SET NULL",
                "ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS default_room_id uuid REFERENCES rooms(id) ON DELETE SET NULL",
                "ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'active'",
                "ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS start_date date",
                "ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS end_date date",
                "ALTER TABLE schedule_slots ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES student_groups(id) ON DELETE SET NULL",
                "ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES student_groups(id) ON DELETE SET NULL",
            ):
                await conn.execute(_text(_stmt))
        _tables_created = True

    async with engine.connect() as conn:
        txn = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        nested = await conn.begin_nested()

        @event.listens_for(session.sync_session, "after_transaction_end")
        def restart_savepoint(s, transaction):
            nonlocal nested
            if transaction.nested and not transaction._parent.nested:
                nested = conn.sync_connection.begin_nested()

        try:
            yield session
        finally:
            await session.close()
            await txn.rollback()

    await engine.dispose()


# ---------------------------------------------------------------------------
# Override app dependency so all endpoints use our test session
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def client(db: AsyncSession):
    """HTTP test client with DB dependency overridden."""
    from app.db.session import get_db

    async def _override_get_db():
        yield db

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=fastapi_app), base_url="http://test"
    ) as ac:
        yield ac
    fastapi_app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Organization fixture
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def org(db: AsyncSession) -> Organization:
    """Create a test organization."""
    o = Organization(
        name="Test School",
        slug=f"test-school-{uuid.uuid4().hex[:8]}",
        is_active=True,
        settings={},
    )
    db.add(o)
    await db.flush()
    return o


@pytest_asyncio.fixture
async def org2(db: AsyncSession) -> Organization:
    """Create a second organization (for cross-org isolation tests)."""
    o = Organization(
        name="Other School",
        slug=f"other-school-{uuid.uuid4().hex[:8]}",
        is_active=True,
        settings={},
    )
    db.add(o)
    await db.flush()
    return o


# ---------------------------------------------------------------------------
# User fixtures for every role
# ---------------------------------------------------------------------------
def _make_user(db, org, role, suffix=""):
    u = User(
        org_id=org.id,
        email=f"{role.value}{suffix}-{uuid.uuid4().hex[:6]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=f"Test {role.value.title()}{suffix}",
        role=role,
        is_active=True,
        consent_accepted_at=datetime.now(timezone.utc),
        privacy_policy_version="1.0",
    )
    db.add(u)
    return u


@pytest_asyncio.fixture
async def super_admin(db: AsyncSession, org: Organization) -> User:
    u = _make_user(db, org, UserRole.super_admin)
    await db.flush()
    return u


@pytest_asyncio.fixture
async def admin(db: AsyncSession, org: Organization) -> User:
    u = _make_user(db, org, UserRole.admin)
    await db.flush()
    return u


@pytest_asyncio.fixture
async def teacher(db: AsyncSession, org: Organization) -> User:
    u = _make_user(db, org, UserRole.teacher)
    await db.flush()
    return u


@pytest_asyncio.fixture
async def student(db: AsyncSession, org: Organization) -> User:
    u = _make_user(db, org, UserRole.student)
    await db.flush()
    return u


@pytest_asyncio.fixture
async def parent(db: AsyncSession, org: Organization) -> User:
    u = _make_user(db, org, UserRole.parent)
    await db.flush()
    return u


@pytest_asyncio.fixture
async def admin2(db: AsyncSession, org2: Organization) -> User:
    """Admin in a different org."""
    u = _make_user(db, org2, UserRole.admin, suffix="2")
    await db.flush()
    return u


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def auth_header(user: User) -> dict[str, str]:
    """Generate Authorization header for a user."""
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Course / module / lesson factory helpers
# ---------------------------------------------------------------------------
async def make_course(db: AsyncSession, org: Organization, teacher: User, **kwargs):
    from app.courses.models import Course, CourseStatus
    c = Course(
        org_id=org.id,
        teacher_id=teacher.id,
        title=kwargs.get("title", f"Test Course {uuid.uuid4().hex[:6]}"),
        slug=kwargs.get("slug", f"test-course-{uuid.uuid4().hex[:8]}"),
        description=kwargs.get("description", "A test course"),
        status=kwargs.get("status", CourseStatus.published),
        category=kwargs.get("category", "programming"),
    )
    db.add(c)
    await db.flush()
    return c


async def make_module(db: AsyncSession, course_id: uuid.UUID, **kwargs):
    from app.courses.models import Module
    m = Module(
        course_id=course_id,
        title=kwargs.get("title", f"Module {uuid.uuid4().hex[:6]}"),
        sort_order=kwargs.get("sort_order", 0),
    )
    db.add(m)
    await db.flush()
    return m


async def make_lesson(db: AsyncSession, module_id: uuid.UUID, **kwargs):
    from app.courses.models import ContentType, Lesson
    l = Lesson(
        module_id=module_id,
        title=kwargs.get("title", f"Lesson {uuid.uuid4().hex[:6]}"),
        content_type=kwargs.get("content_type", ContentType.text),
        content=kwargs.get("content", {"body": "Test lesson content"}),
        sort_order=kwargs.get("sort_order", 0),
        duration_minutes=kwargs.get("duration_minutes", 10),
    )
    db.add(l)
    await db.flush()
    return l


async def make_enrollment(db: AsyncSession, course_id: uuid.UUID, student_id: uuid.UUID):
    from app.progress.models import Enrollment
    e = Enrollment(
        course_id=course_id,
        student_id=student_id,
        enrolled_at=datetime.now(timezone.utc),
    )
    db.add(e)
    await db.flush()
    return e


async def make_exercise(db: AsyncSession, lesson_id: uuid.UUID, org_id: uuid.UUID, **kwargs):
    from app.exercises.models import Exercise, ExerciseType
    ex = Exercise(
        lesson_id=lesson_id,
        org_id=org_id,
        exercise_type=kwargs.get("exercise_type", ExerciseType.quiz),
        title=kwargs.get("title", f"Exercise {uuid.uuid4().hex[:6]}"),
        display_id=kwargs.get("display_id", f"EX-{uuid.uuid4().hex[:6]}"),
        config=kwargs.get("config", {}),
        sort_order=kwargs.get("sort_order", 0),
    )
    db.add(ex)
    await db.flush()
    return ex


async def make_assignment(db: AsyncSession, org_id, course_id, created_by, **kwargs):
    from app.assignments.models import Assignment
    a = Assignment(
        org_id=org_id,
        course_id=course_id,
        created_by=created_by,
        title=kwargs.get("title", f"Assignment {uuid.uuid4().hex[:6]}"),
        description=kwargs.get("description", "Test assignment"),
        due_date=kwargs.get("due_date", datetime(2030, 12, 31, tzinfo=timezone.utc)),
        max_score=kwargs.get("max_score", 100),
        allow_late=kwargs.get("allow_late", True),
    )
    db.add(a)
    await db.flush()
    return a
