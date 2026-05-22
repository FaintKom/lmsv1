"""Deterministic QA seed.

Idempotent: run twice, no duplicates. Run inside the backend container after
`alembic upgrade head`:

    docker compose -f docker-compose.qa.yml exec -T backend python scripts/seed_qa.py

Creates: 4 role users, 1 organization, 1 course with 1 module and 1 lesson,
1 student enrollment. UUIDs are derived from string slugs so tests can
reference them without round-tripping to the DB.

Exit codes:
  0 - success
  non-zero - abort. CI must not run tests against a half-seeded DB.

Scope note: this file deliberately does NOT create exercises. That is a
follow-up (Phase 2 PR) because quiz/code_challenge store their Question /
TestCase rows in separate tables and the fixture-to-row mapping deserves
its own commit + review pass.
"""
import asyncio
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
import app.discussions.models  # noqa: F401
import app.exercises.models  # noqa: F401
import app.gamification.models  # noqa: F401
import app.learning_paths.models  # noqa: F401
import app.meetings.models  # noqa: F401
import app.metered_billing.models  # noqa: F401
import app.notifications.models  # noqa: F401
import app.peer_review.models  # noqa: F401
import app.plagiarism.models  # noqa: F401
import app.progress.models  # noqa: F401
import app.recording.models  # noqa: F401
import app.sandbox.models  # noqa: F401
import app.scorm.models  # noqa: F401
import app.skills.models  # noqa: F401
import app.submissions.models  # noqa: F401
import app.team_projects.models  # noqa: F401
import app.waitlist.models  # noqa: F401
import app.webhooks.models  # noqa: F401

from app.auth.models import Organization, User, UserRole
from app.auth.security import hash_password
from app.courses.models import Course, CourseStatus, Lesson, Module
from app.db.session import async_session_factory
from app.progress.models import Enrollment

NAMESPACE_QA = uuid.UUID("12345678-1234-5678-1234-567812345678")

QA_PASSWORD = "QaTest2026!"

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


async def main() -> int:
    async with async_session_factory() as db:
        org = await upsert_org(db)
        users = await upsert_users(db, org)
        course, _module, lesson = await upsert_course_tree(db, org, users["qa-teacher"])
        await upsert_enrollment(db, course, users["qa-student"])
        await db.commit()
        # Machine-parseable lines for CI to capture as job outputs.
        print(f"QA_ORG_ID={org.id}")
        print(f"QA_COURSE_ID={course.id}")
        print(f"QA_LESSON_ID={lesson.id}")
        print(f"OK: org={org.id} course={course.id} lesson={lesson.id} users={len(users)}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
