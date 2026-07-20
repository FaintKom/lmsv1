"""Demo student activity seed — makes analytics dashboards non-empty.

Creates 10 clearly-synthetic demo students (demo-student-NN@grasslms.online)
and simulates 3 weeks of realistic activity across 2 courses:

  - enrollments spread over the window
  - exercise submissions with a realistic score distribution
    (some fail -> retry -> pass, ~75% of exercises attempted)
  - XP awarded through the real gamification service (award_xp), so
    streak/leaderboard analytics stay consistent
  - assignment ("project") submissions from ~60% of students, half graded

Submissions are written directly at the ORM level with the same field shape
the exercises service produces (score/passed/status/attempt_number/timing).
We deliberately do NOT call submit_exercise(): generating per-type answer
payloads that grade to a target score is an inverse problem across 24
exercise types — we set the outcome distribution directly instead.

Deterministic (uuid5 slugs + seeded RNG) => idempotent: run twice, no dupes.

Usage (host, backend deps installed, DB up):
    cd backend && python ../scripts/seed_demo_activity.py [--org-slug SLUG]
        [--courses slug1,slug2] [--cleanup]

  --org-slug   org to attach students to; default: the only org in the DB
               (errors out with a list if there are several)
  --courses    comma-separated course slugs; default: first 2 published
               courses of the org that have at least one exercise
  --cleanup    delete the demo students (CASCADE removes their activity)

Exit codes: 0 success, non-zero abort.
"""
import argparse
import asyncio
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_BACKEND_ROOT = _REPO_ROOT / "backend"
for p in (str(_BACKEND_ROOT), str(_REPO_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Side-effect import: app.main pulls in EVERY model module (its lifespan
# import block), so SQLAlchemy's registry can resolve every string-based
# relationship() reference. Hand-maintained model lists rot — seed_qa.py's
# did (deleted discussions/plagiarism modules).
import app.main  # noqa: F401

from app.assignments.models import Assignment, AssignmentStatus, AssignmentSubmission
from app.auth.models import Organization, User, UserRole
from app.auth.security import hash_password
from app.courses.models import Course, CourseStatus, Lesson, Module
from app.db.session import async_session_factory
from app.exercises.models import Exercise, ExerciseSubmission, ExerciseType
from app.gamification.service import award_xp
from app.progress.models import Enrollment

NAMESPACE_DEMO = uuid.UUID("87654321-4321-8765-4321-876543218765")
EMAIL_TMPL = "demo-student-{:02d}@grasslms.online"
DAYS_WINDOW = 21

STUDENT_NAMES = [
    "Elif Kaya", "Jonas Weber", "Sofia Marino", "Liam O'Connor", "Ana Petrova",
    "Mateo Silva", "Yuki Tanaka", "Clara Dubois", "Omar Haddad", "Nina Kovacs",
]

def demo_uuid(slug: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE_DEMO, slug)


def slot_rng(slug: str) -> random.Random:
    """Deterministic RNG per (student, exercise/course) slot.

    A single shared RNG breaks idempotency: on re-runs, existing rows skip
    some rng calls, shifting the stream and changing every later decision.
    Per-slot seeding makes each decision independent of visit order.
    """
    return random.Random(f"demo-seed:{slug}")


async def resolve_org(db: AsyncSession, org_slug: str | None) -> Organization:
    if org_slug:
        org = (
            await db.execute(select(Organization).where(Organization.slug == org_slug))
        ).scalar_one_or_none()
        if not org:
            raise SystemExit(f"Org with slug '{org_slug}' not found")
        return org
    orgs = (await db.execute(select(Organization))).scalars().all()
    if len(orgs) == 1:
        return orgs[0]
    slugs = ", ".join(o.slug for o in orgs) or "(none)"
    raise SystemExit(f"Multiple/no orgs in DB — pass --org-slug. Found: {slugs}")


async def resolve_courses(
    db: AsyncSession, org: Organization, course_slugs: str | None
) -> list[Course]:
    if course_slugs:
        slugs = [s.strip() for s in course_slugs.split(",") if s.strip()]
        courses = (
            (await db.execute(select(Course).where(Course.slug.in_(slugs))))
            .scalars()
            .all()
        )
        missing = set(slugs) - {c.slug for c in courses}
        if missing:
            raise SystemExit(f"Courses not found: {sorted(missing)}")
        return list(courses)

    published = (
        (
            await db.execute(
                select(Course)
                .where(Course.org_id == org.id, Course.status == CourseStatus.published)
                .order_by(Course.created_at)
            )
        )
        .scalars()
        .all()
    )
    picked: list[Course] = []
    for c in published:
        if await course_exercises(db, c):
            picked.append(c)
        if len(picked) == 2:
            break
    if len(picked) < 2:
        raise SystemExit(
            f"Need 2 published courses with exercises in org '{org.slug}', "
            f"found {len(picked)}. Pass --courses or seed content first."
        )
    return picked


async def course_exercises(db: AsyncSession, course: Course) -> list[Exercise]:
    rows = (
        await db.execute(
            select(Exercise)
            .join(Lesson, Exercise.lesson_id == Lesson.id)
            .join(Module, Lesson.module_id == Module.id)
            .where(Module.course_id == course.id)
            .order_by(Exercise.sort_order)
        )
    ).scalars()
    return list(rows)


async def upsert_students(db: AsyncSession, org: Organization) -> list[User]:
    students: list[User] = []
    for i, name in enumerate(STUDENT_NAMES, start=1):
        email = EMAIL_TMPL.format(i)
        uid = demo_uuid(f"demo-student-{i}")
        user = await db.get(User, uid)
        if user is None:
            user = (
                await db.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
        if user is None:
            user = User(
                id=uid,
                org_id=org.id,
                email=email,
                # Random unknown password — demo students are data, not logins.
                hashed_password=hash_password(uuid.uuid4().hex),
                full_name=name,
                role=UserRole.student,
                is_active=True,
            )
            db.add(user)
        students.append(user)
    await db.flush()
    return students


async def upsert_enrollment(
    db: AsyncSession, course: Course, student: User, when: datetime
) -> None:
    existing = (
        await db.execute(
            select(Enrollment).where(
                Enrollment.course_id == course.id,
                Enrollment.student_id == student.id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        return
    db.add(Enrollment(course_id=course.id, student_id=student.id, enrolled_at=when))
    await db.flush()


def xp_for(ex_type: ExerciseType) -> tuple[int, str]:
    if ex_type == ExerciseType.code_challenge:
        return 50, "code_challenge_passed"
    return 25, "exercise_passed"


async def seed_exercise_activity(
    db: AsyncSession,
    students: list[User],
    courses: list[Course],
    now: datetime,
) -> int:
    """Per student x course: attempt ~75% of exercises, fail->retry sometimes."""
    created = 0
    window_start = now - timedelta(days=DAYS_WINDOW)

    for course in courses:
        exercises = await course_exercises(db, course)
        for student in students:
            enr_rng = slot_rng(f"enr-{student.id}-{course.id}")
            enroll_at = window_start + timedelta(
                days=enr_rng.uniform(0, 5), hours=enr_rng.uniform(0, 12)
            )
            await upsert_enrollment(db, course, student, enroll_at)

            # Each student works through exercises over the window. Pace steps
            # to the window size so the trajectory reaches ~today instead of
            # bunching in the first days (v1 used fixed 2-30h steps).
            t = enroll_at
            # Divide by the ~75% attempted fraction, not the full count —
            # skipped exercises consume no step, so full-count pacing ends
            # the trajectory days early.
            mean_step_h = (now - enroll_at).total_seconds() / 3600 / max(
                1, len(exercises) * 0.75
            )
            for ex in exercises:
                r = slot_rng(f"ex-{student.id}-{ex.id}")
                if r.random() > 0.75:
                    continue  # skipped this exercise — realistic completion rate
                t = t + timedelta(hours=r.uniform(0.5, 1.5) * mean_step_h)
                if t >= now:
                    break

                first_passes = r.random() < 0.65
                attempts: list[tuple[int, bool, float]] = []
                if first_passes:
                    attempts.append((1, True, r.uniform(70, 100)))
                else:
                    attempts.append((1, False, r.uniform(20, 65)))
                    if r.random() < 0.7:  # retries and passes
                        attempts.append((2, True, r.uniform(70, 95)))

                for attempt_no, passed, score in attempts:
                    slug = f"sub-{student.id}-{ex.id}-{attempt_no}"
                    sid = demo_uuid(slug)
                    submitted = t + timedelta(minutes=r.uniform(5, 120) * attempt_no)
                    time_spent = int(r.uniform(30, 600))
                    started = submitted - timedelta(minutes=r.uniform(1, 10))
                    if await db.get(ExerciseSubmission, sid) is not None:
                        continue
                    sub = ExerciseSubmission(
                        id=sid,
                        exercise_id=ex.id,
                        student_id=student.id,
                        answers={"demo_seed": True},
                        score=round(score, 2),
                        passed=passed,
                        status="graded",
                        submitted_at=submitted,
                        graded_at=submitted,
                        attempt_number=attempt_no,
                        time_spent_seconds=time_spent,
                        started_at=started,
                        created_at=submitted,
                        updated_at=submitted,
                    )
                    db.add(sub)
                    created += 1
                    if passed:
                        amount, reason = xp_for(ex.exercise_type)
                        await award_xp(db, student.id, amount, reason)
                await db.flush()
    return created


async def seed_project_submissions(
    db: AsyncSession,
    students: list[User],
    courses: list[Course],
    org: Organization,
    now: datetime,
) -> int:
    """Ensure each course has a project assignment; ~60% of students submit."""
    created = 0
    for course in courses:
        assignment = (
            await db.execute(
                select(Assignment)
                .where(Assignment.course_id == course.id)
                .order_by(Assignment.created_at)
                .limit(1)
            )
        ).scalar_one_or_none()
        if assignment is None:
            assignment = Assignment(
                id=demo_uuid(f"assignment-{course.id}"),
                org_id=org.id,
                course_id=course.id,
                created_by=course.teacher_id,
                title=f"{course.title} — Course project",
                description="Apply what you learned in a small project.",
                due_date=now + timedelta(days=7),
                max_score=100,
            )
            db.add(assignment)
            await db.flush()

        for student in students:
            r = slot_rng(f"proj-{student.id}-{assignment.id}")
            if r.random() > 0.6:
                continue
            sid = demo_uuid(f"asub-{student.id}-{assignment.id}")
            if await db.get(AssignmentSubmission, sid) is not None:
                continue
            submitted = now - timedelta(days=r.uniform(1, 10))
            graded = r.random() < 0.5
            sub = AssignmentSubmission(
                id=sid,
                assignment_id=assignment.id,
                student_id=student.id,
                content=f"Demo project submission by {student.full_name}.",
                submitted_at=submitted,
                status=AssignmentStatus.graded if graded else AssignmentStatus.submitted,
                score=round(r.uniform(60, 95), 1) if graded else None,
                graded_by=course.teacher_id if graded else None,
                graded_at=submitted + timedelta(days=r.uniform(0.5, 3)) if graded else None,
                time_spent_seconds=int(r.uniform(1800, 14400)),
                attempt_number=1,
                created_at=submitted,
                updated_at=submitted,
            )
            db.add(sub)
            created += 1
        await db.flush()
    return created


async def cleanup(db: AsyncSession) -> int:
    """Delete demo students; FK CASCADEs remove their activity."""
    emails = [EMAIL_TMPL.format(i) for i in range(1, len(STUDENT_NAMES) + 1)]
    users = (
        (await db.execute(select(User).where(User.email.in_(emails)))).scalars().all()
    )
    for u in users:
        await db.delete(u)
    await db.flush()
    return len(users)


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--org-slug", default=None)
    parser.add_argument("--courses", default=None, help="comma-separated slugs")
    parser.add_argument("--cleanup", action="store_true")
    args = parser.parse_args()

    # Midnight-anchored: `now` is stable within a day, so re-runs on the same
    # day cannot shift the activity window and create boundary duplicates.
    now = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    async with async_session_factory() as db:
        if args.cleanup:
            n = await cleanup(db)
            await db.commit()
            print(f"CLEANUP_OK: removed {n} demo students (+ cascaded activity)")
            return 0

        org = await resolve_org(db, args.org_slug)
        courses = await resolve_courses(db, org, args.courses)
        students = await upsert_students(db, org)
        n_sub = await seed_exercise_activity(db, students, courses, now)
        n_proj = await seed_project_submissions(db, students, courses, org, now)
        await db.commit()
        print(f"DEMO_STUDENTS={len(students)}")
        print(f"DEMO_COURSES={[c.slug for c in courses]}")
        print(f"DEMO_EXERCISE_SUBMISSIONS={n_sub}")
        print(f"DEMO_PROJECT_SUBMISSIONS={n_proj}")
        print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
