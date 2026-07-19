"""Deterministic QA seed.

Idempotent: run twice, no duplicates. Run inside the backend container after
`alembic upgrade head`:

    docker compose -f docker-compose.qa.yml exec -T backend python scripts/seed_qa.py

Creates:
  - 1 organization
  - 4 role users (student, teacher, methodist, admin)
  - 1 published course -> 1 module -> 1 lesson
  - 1 student enrollment
  - 24 exercises (one per ExerciseType), loaded from qa/exercise-fixtures.json,
    with Question rows for quiz/reading and TestCase rows for code_challenge.

UUIDs are derived from string slugs (`uuid.uuid5(NAMESPACE_QA, slug)`) so
tests can reference them without round-tripping to the DB.

Exit codes:
  0 - success
  non-zero - abort. CI must not run tests against a half-seeded DB.
"""
import asyncio
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Mounted from the host into /app/scripts; the `app` package lives at /app/app
# but the script's own directory (/app/scripts) is what Python prepends to
# sys.path by default. Insert the parent so `from app.auth.models import ...`
# resolves without relying on PYTHONPATH (which gets mangled by Git Bash on
# Windows: /app -> C:/Program Files/Git/app).
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Side-effect imports: load every model module so SQLAlchemy's class registry
# can resolve every string-based `relationship("Foo")` reference before the
# first query runs. Same pattern as backend/tests/conftest.py.
import app.admin.models  # noqa: F401
import app.assessments.models  # noqa: F401
import app.assignments.models  # noqa: F401
import app.attendance.models  # noqa: F401
import app.auth.models  # noqa: F401
import app.billing.models  # noqa: F401
import app.calendar.models  # noqa: F401
import app.certificates.models  # noqa: F401
import app.courses.models  # noqa: F401
import app.exercises.models  # noqa: F401
import app.gamification.models  # noqa: F401
import app.learning_paths.models  # noqa: F401
import app.meetings.models  # noqa: F401
import app.metered_billing.models  # noqa: F401
import app.notifications.models  # noqa: F401
import app.peer_review.models  # noqa: F401
import app.progress.models  # noqa: F401
import app.recording.models  # noqa: F401
import app.sandbox.models  # noqa: F401
import app.scorm.models  # noqa: F401
import app.skills.models  # noqa: F401
import app.submissions.models  # noqa: F401
import app.team_projects.models  # noqa: F401
import app.waitlist.models  # noqa: F401
import app.webhooks.models  # noqa: F401

from app.assessments.models import Question, QuestionType
from app.auth.models import Organization, User, UserRole
from app.auth.security import hash_password
from app.courses.models import Course, CourseStatus, Lesson, Module
from app.db.session import async_session_factory
from app.exercises.models import Exercise, ExerciseType
from app.progress.models import Enrollment
from app.sandbox.models import TestCase

FIXTURES_PATH = _BACKEND_ROOT / "qa" / "exercise-fixtures.json"

NAMESPACE_QA = uuid.UUID("12345678-1234-5678-1234-567812345678")

QA_PASSWORD = "qa-test-not-for-prod"

# Methodist is modelled as a teacher with is_methodist=True (there is no
# dedicated UserRole enum value - see backend/app/auth/models.py).
QA_USERS = [
    {"slug": "qa-student",   "email": "qa-student@qa.example.com",   "role": UserRole.student, "is_methodist": False, "name": "QA Student"},
    {"slug": "qa-teacher",   "email": "qa-teacher@qa.example.com",   "role": UserRole.teacher, "is_methodist": False, "name": "QA Teacher"},
    {"slug": "qa-methodist", "email": "qa-methodist@qa.example.com", "role": UserRole.teacher, "is_methodist": True,  "name": "QA Methodist"},
    {"slug": "qa-admin",     "email": "qa-admin@qa.example.com",     "role": UserRole.admin,   "is_methodist": False, "name": "QA Admin"},
]

QA_ORG_ID    = uuid.uuid5(NAMESPACE_QA, "qa-org")
QA_COURSE_ID = uuid.uuid5(NAMESPACE_QA, "qa-course")
QA_MODULE_ID = uuid.uuid5(NAMESPACE_QA, "qa-module")
QA_LESSON_ID = uuid.uuid5(NAMESPACE_QA, "qa-lesson")


def qa_uuid(slug: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE_QA, slug)


async def upsert_org(db: AsyncSession) -> Organization:
    existing = await db.get(Organization, QA_ORG_ID)
    if existing:
        return existing
    org = Organization(
        id=QA_ORG_ID,
        name="QA Organization",
        slug="qa-org",
        is_active=True,
    )
    db.add(org)
    await db.flush()
    return org


async def upsert_users(db: AsyncSession, org: Organization) -> dict[str, User]:
    """Upsert QA users.

    Matches on EMAIL first, not just id: the backend's lifespan can
    bootstrap a super-admin with `SUPER_ADMIN_EMAIL=qa-admin@qa.example.com`
    using a random UUID, which would collide with our deterministic uuid5
    on the unique-email constraint. When an email match is found we adopt
    the existing row and update its role / methodist flag / org / password
    so QA always has predictable creds regardless of who created the row.
    """
    users: dict[str, User] = {}
    pw_hash = hash_password(QA_PASSWORD)
    for spec in QA_USERS:
        uid = qa_uuid(spec["slug"])

        existing = await db.get(User, uid)
        if existing is None:
            stmt = select(User).where(User.email == spec["email"])
            existing = (await db.execute(stmt)).scalar_one_or_none()

        if existing is not None:
            existing.email = spec["email"]
            existing.org_id = org.id
            existing.full_name = spec["name"]
            existing.role = spec["role"]
            existing.is_active = True
            existing.is_methodist = spec["is_methodist"]
            existing.hashed_password = pw_hash
            users[spec["slug"]] = existing
            continue

        user = User(
            id=uid,
            org_id=org.id,
            email=spec["email"],
            hashed_password=pw_hash,
            full_name=spec["name"],
            role=spec["role"],
            is_active=True,
            is_methodist=spec["is_methodist"],
        )
        db.add(user)
        users[spec["slug"]] = user
    await db.flush()
    return users


async def upsert_course_tree(
    db: AsyncSession, org: Organization, teacher: User
) -> tuple[Course, Module, Lesson]:
    course = await db.get(Course, QA_COURSE_ID)
    if not course:
        course = Course(
            id=QA_COURSE_ID,
            org_id=org.id,
            teacher_id=teacher.id,
            title="QA Course",
            slug="qa-course",
            description="Deterministic course for QA runs.",
            status=CourseStatus.published,
        )
        db.add(course)
        await db.flush()

    module = await db.get(Module, QA_MODULE_ID)
    if not module:
        module = Module(
            id=QA_MODULE_ID,
            course_id=course.id,
            title="QA Module",
            sort_order=0,
        )
        db.add(module)
        await db.flush()

    lesson = await db.get(Lesson, QA_LESSON_ID)
    if not lesson:
        lesson = Lesson(
            id=QA_LESSON_ID,
            module_id=module.id,
            title="QA Lesson",
            sort_order=0,
        )
        db.add(lesson)
        await db.flush()

    return course, module, lesson


async def upsert_enrollment(
    db: AsyncSession, course: Course, student: User
) -> None:
    stmt = select(Enrollment).where(
        Enrollment.course_id == course.id,
        Enrollment.student_id == student.id,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return
    db.add(
        Enrollment(
            course_id=course.id,
            student_id=student.id,
            enrolled_at=datetime.now(timezone.utc),
        )
    )
    await db.flush()


# ---------------------------------------------------------------------------
# Exercises (one per ExerciseType, loaded from qa/exercise-fixtures.json)
# ---------------------------------------------------------------------------

def load_fixtures() -> list[dict]:
    """Read qa/exercise-fixtures.json. Returns the `fixtures` list."""
    data = json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))
    return data["fixtures"]


def assert_fixture_coverage() -> None:
    """Abort early if any ExerciseType enum value lacks a fixture or vice versa.

    Catches the most common regression: adding a new exercise type to the
    backend enum without registering a QA fixture (or vice versa). The QA
    matrix test is meaningless if these drift.
    """
    fixtures = load_fixtures()
    fx_types = {fx["type"] for fx in fixtures}
    enum_types = {e.value for e in ExerciseType}
    missing = enum_types - fx_types
    extra = fx_types - enum_types
    if missing or extra:
        raise SystemExit(
            f"Fixture mismatch: missing={sorted(missing)} extra={sorted(extra)}"
        )


async def upsert_exercises(
    db: AsyncSession, org: Organization, lesson: Lesson
) -> list[Exercise]:
    """Create one Exercise per fixture entry, with Question / TestCase children.

    Idempotent: matches by deterministic uuid5. Existing rows are kept as-is
    (no field updates). Re-running after a fixture content change therefore
    does NOT propagate the change to already-seeded rows - tear down the DB
    (`docker compose down -v`) and re-seed for that. Acceptable trade-off:
    the QA stack is ephemeral, and idempotency exists for safety on re-runs
    in CI, not for live edit-and-reseed loops.
    """
    fixtures = load_fixtures()
    created: list[Exercise] = []

    for i, fx in enumerate(fixtures):
        ex_id = qa_uuid(f"qa-exercise-{fx['type']}")
        existing = await db.get(Exercise, ex_id)
        if existing is not None:
            created.append(existing)
            continue

        ex = Exercise(
            id=ex_id,
            lesson_id=lesson.id,
            org_id=org.id,
            display_id=f"QA-{fx['type'][:10].upper()}-{i:02d}",
            exercise_type=ExerciseType(fx["type"]),
            title=f"QA {fx['label']}",
            config=fx.get("config", {}),
            sort_order=i,
        )
        db.add(ex)
        await db.flush()  # need ex.id for FK below

        # Optional children: questions (quiz/reading) and test_cases (code_challenge).
        for j, q_spec in enumerate(fx.get("questions") or []):
            q = Question(
                id=qa_uuid(f"qa-question-{fx['type']}-{j}"),
                exercise_id=ex.id,
                question_text=q_spec["question_text"],
                question_type=QuestionType(q_spec["question_type"]),
                options=q_spec.get("options"),
                correct_answer=q_spec.get("correct_answer"),
                points=q_spec.get("points", 1),
                sort_order=j,
            )
            db.add(q)

        for k, tc_spec in enumerate(fx.get("test_cases") or []):
            tc = TestCase(
                id=qa_uuid(f"qa-testcase-{fx['type']}-{k}"),
                exercise_id=ex.id,
                input=tc_spec.get("input", ""),
                expected_output=tc_spec["expected_output"],
                is_hidden=tc_spec.get("is_hidden", False),
                sort_order=k,
            )
            db.add(tc)

        await db.flush()
        created.append(ex)

    return created


async def main() -> int:
    assert_fixture_coverage()
    async with async_session_factory() as db:
        org = await upsert_org(db)
        users = await upsert_users(db, org)
        course, _module, lesson = await upsert_course_tree(db, org, users["qa-teacher"])
        await upsert_enrollment(db, course, users["qa-student"])
        exercises = await upsert_exercises(db, org, lesson)
        await db.commit()
        # Machine-parseable lines for CI to capture as job outputs.
        print(f"QA_EXERCISE_COUNT={len(exercises)}")
        print(f"QA_ORG_ID={org.id}")
        print(f"QA_COURSE_ID={course.id}")
        print(f"QA_LESSON_ID={lesson.id}")
        print(f"OK: org={org.id} course={course.id} lesson={lesson.id} users={len(users)}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
