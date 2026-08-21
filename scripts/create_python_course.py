"""Create the "Python from scratch" course from authored content files.

Content lives in ``scripts/content/python/*.json`` — one file per module, so a
lesson can be edited without scrolling past 18 others. This script only wires
JSON into rows; all prose and exercise configs live in the content files.

Topic coverage follows the structure of a well-known public Python handbook
(what a beginner course has to cover, in the order it has to cover it). Every
sentence of prose here is written from scratch — no text is copied from any
source.

Deliberate deviation from the reference: the final module covers the standard
library (math / random / statistics / datetime / collections) instead of
numpy, pandas and requests. The sandbox that runs student code has no network
access and only the standard library available, so exercises built on those
packages could not be graded.

Idempotent: rows are matched by deterministic uuid5 and left untouched if they
already exist. Editing a content file does NOT rewrite already-seeded rows —
delete the course and re-run to pick edits up:

    DELETE FROM courses WHERE slug = 'python-from-scratch';

Run locally (a local postgres on 5432; the packaged default DSN points at the
docker-internal host, so pass DATABASE_URL explicitly from the host):

    DATABASE_URL="postgresql+asyncpg://lms:PASSWORD@localhost:5432/lms" \
        python scripts/create_python_course.py --org-slug qa-org

Run in the prod container (scripts/ is not in the image — copy both the script
and the content directory first):

    docker compose -f docker-compose.prod.yml cp scripts/create_python_course.py backend:/tmp/py.py
    docker compose -f docker-compose.prod.yml cp scripts/content backend:/tmp/content
    docker compose -f docker-compose.prod.yml exec -T -e PYTHONPATH=/app backend \
        python /tmp/py.py --org-slug demo --content-dir /tmp/content/python
"""
import argparse
import asyncio
import json
import sys
import uuid
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_BACKEND_ROOT = _REPO_ROOT
if not (_BACKEND_ROOT / "app").is_dir() and (_BACKEND_ROOT / "backend" / "app").is_dir():
    _BACKEND_ROOT = _BACKEND_ROOT / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import select  # noqa: E402

# Side-effect imports so SQLAlchemy can resolve string-based relationship()
# targets. Duplicated from scripts/seed_qa.py on purpose: that script is a CI
# gate for the e2e workflow, and factoring this list into a shared module would
# put a refactor in the blast radius of every QA run for no functional gain.
import app.admin.models  # noqa: F401,E402
import app.assessments.models  # noqa: F401,E402
import app.assignments.models  # noqa: F401,E402
import app.attendance.models  # noqa: F401,E402
import app.auth.models  # noqa: F401,E402
import app.billing.models  # noqa: F401,E402
import app.calendar.models  # noqa: F401,E402
import app.certificates.models  # noqa: F401,E402
import app.courses.models  # noqa: F401,E402
import app.exercises.models  # noqa: F401,E402
import app.gamification.models  # noqa: F401,E402
import app.learning_paths.models  # noqa: F401,E402
import app.metered_billing.models  # noqa: F401,E402
import app.notifications.models  # noqa: F401,E402
import app.peer_review.models  # noqa: F401,E402
import app.progress.models  # noqa: F401,E402
import app.recording.models  # noqa: F401,E402
import app.rooms.models  # noqa: F401,E402
import app.sandbox.models  # noqa: F401,E402
import app.sites.models  # noqa: F401,E402
import app.scorm.models  # noqa: F401,E402
import app.skills.models  # noqa: F401,E402
import app.submissions.models  # noqa: F401,E402
import app.team_projects.models  # noqa: F401,E402
import app.waitlist.models  # noqa: F401,E402
import app.webhooks.models  # noqa: F401,E402

from app.assessments.models import Question, QuestionType  # noqa: E402
from app.auth.models import Organization, User, UserRole  # noqa: E402
from app.courses.models import ContentType, Course, CourseStatus, Lesson, Module  # noqa: E402
from app.db.session import async_session_factory  # noqa: E402
from app.exercises.models import Exercise, ExerciseType  # noqa: E402
from app.sandbox.models import TestCase  # noqa: E402

NAMESPACE_PY = uuid.UUID("2c7e5a10-8b3d-5f4c-9e21-6a0d8f3b1c47")

COURSE_SLUG = "python-from-scratch"
COURSE_TITLE = "Python from scratch"
COURSE_DESCRIPTION = (
    "A short, complete introduction to Python: how the interpreter runs your code, "
    "control flow, the built-in collections, functions, classes, and the parts of the "
    "standard library you reach for every day. Every lesson ends with exercises that "
    "run and grade automatically."
)


def py_uuid(slug: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE_PY, slug)


def load_modules(content_dir: Path) -> list[dict]:
    files = sorted(content_dir.glob("*.json"))
    if not files:
        raise SystemExit(f"No content files in {content_dir}")
    modules = [json.loads(f.read_text(encoding="utf-8")) for f in files]
    modules.sort(key=lambda m: m["order"])
    validate(modules)
    return modules


def validate(modules: list[dict]) -> None:
    """Fail before touching the DB — a half-seeded course is worse than none."""
    problems: list[str] = []
    seen_module_slugs: set[str] = set()
    valid_types = {e.value for e in ExerciseType}

    for m in modules:
        if m["slug"] in seen_module_slugs:
            problems.append(f"duplicate module slug {m['slug']!r}")
        seen_module_slugs.add(m["slug"])

        seen_lesson_slugs: set[str] = set()
        for lesson in m["lessons"]:
            key = f"{m['slug']}/{lesson['slug']}"
            if lesson["slug"] in seen_lesson_slugs:
                problems.append(f"duplicate lesson slug {key!r}")
            seen_lesson_slugs.add(lesson["slug"])

            refs = {ex["ref"] for ex in lesson.get("exercises", [])}
            for ex in lesson.get("exercises", []):
                if ex["type"] not in valid_types:
                    problems.append(f"{key}: unknown exercise type {ex['type']!r}")
            used = {b["ref"] for b in lesson["blocks"] if b["type"] == "exercise"}
            if used - refs:
                problems.append(
                    f"{key}: block references missing exercise {sorted(used - refs)}"
                )
            if refs - used:
                problems.append(
                    f"{key}: exercise never placed in a block {sorted(refs - used)}"
                )

    if problems:
        raise SystemExit("Content is invalid:\n  " + "\n  ".join(problems))


async def resolve_org_and_teacher(db, org_slug: str) -> tuple[Organization, User]:
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise SystemExit(f"No organization with slug {org_slug!r}. Pass --org-slug.")

    teacher = (
        await db.execute(
            select(User)
            .where(
                User.org_id == org.id,
                User.role.in_([UserRole.teacher, UserRole.admin]),
                User.is_active.is_(True),
            )
            .order_by(User.created_at)
        )
    ).scalars().first()
    if teacher is None:
        raise SystemExit(
            f"Organization {org_slug!r} has no active teacher or admin to own the course."
        )
    return org, teacher


async def upsert_course(db, org: Organization, teacher: User) -> Course:
    course_id = py_uuid("course")
    course = await db.get(Course, course_id)
    if course:
        return course
    course = Course(
        id=course_id,
        org_id=org.id,
        teacher_id=teacher.id,
        title=COURSE_TITLE,
        slug=COURSE_SLUG,
        description=COURSE_DESCRIPTION,
        status=CourseStatus.published,
        category="programming",
    )
    db.add(course)
    await db.flush()
    return course


async def upsert_exercise(
    db, org: Organization, lesson: Lesson, module_slug: str, spec: dict, order: int
) -> Exercise:
    ex_id = py_uuid(f"exercise-{module_slug}-{spec['ref']}")
    existing = await db.get(Exercise, ex_id)
    if existing:
        return existing

    ex = Exercise(
        id=ex_id,
        lesson_id=lesson.id,
        org_id=org.id,
        display_id=f"PY-{spec['ref'].upper()[:14]}",
        exercise_type=ExerciseType(spec["type"]),
        title=spec["title"],
        config=spec.get("config", {}),
        sort_order=order,
    )
    db.add(ex)
    await db.flush()

    for j, q in enumerate(spec.get("questions") or []):
        db.add(
            Question(
                id=py_uuid(f"question-{module_slug}-{spec['ref']}-{j}"),
                exercise_id=ex.id,
                question_text=q["question_text"],
                question_type=QuestionType(q["question_type"]),
                options=q.get("options"),
                correct_answer=q.get("correct_answer"),
                points=q.get("points", 1),
                sort_order=j,
            )
        )
    for k, tc in enumerate(spec.get("test_cases") or []):
        db.add(
            TestCase(
                id=py_uuid(f"testcase-{module_slug}-{spec['ref']}-{k}"),
                exercise_id=ex.id,
                input=tc.get("input", ""),
                expected_output=tc["expected_output"],
                is_hidden=tc.get("is_hidden", False),
                sort_order=k,
            )
        )
    await db.flush()
    return ex


async def upsert_lesson(
    db, org: Organization, module: Module, module_slug: str, spec: dict, order: int
) -> Lesson:
    lesson_id = py_uuid(f"lesson-{module_slug}-{spec['slug']}")
    lesson = await db.get(Lesson, lesson_id)
    if lesson:
        return lesson

    lesson = Lesson(
        id=lesson_id,
        module_id=module.id,
        title=spec["title"],
        content_type=ContentType.text,
        content={"version": 2, "blocks": []},
        sort_order=order,
        duration_minutes=spec.get("duration_minutes", 20),
    )
    db.add(lesson)
    await db.flush()

    # Exercises first — blocks need their ids.
    ex_by_ref: dict[str, Exercise] = {}
    for i, ex_spec in enumerate(spec.get("exercises", [])):
        ex_by_ref[ex_spec["ref"]] = await upsert_exercise(
            db, org, lesson, module_slug, ex_spec, i
        )

    blocks = []
    for i, b in enumerate(spec["blocks"]):
        base = {
            "id": str(py_uuid(f"block-{module_slug}-{spec['slug']}-{i}")),
            "type": b["type"],
            "sort_order": i,
            "page": b.get("page", 1),
        }
        if b["type"] == "text":
            base["body"] = b["body"]
            base["format"] = "html"
        elif b["type"] == "exercise":
            base["exercise_id"] = str(ex_by_ref[b["ref"]].id)
        elif b["type"] == "video":
            base["url"] = b["url"]
        else:
            raise SystemExit(f"Unsupported block type {b['type']!r}")
        blocks.append(base)

    lesson.content = {"version": 2, "blocks": blocks}
    await db.flush()
    return lesson


async def main() -> int:
    parser = argparse.ArgumentParser(description="Seed the Python course.")
    parser.add_argument("--org-slug", default="demo")
    parser.add_argument(
        "--content-dir",
        default=str(Path(__file__).resolve().parent / "content" / "python"),
    )
    args = parser.parse_args()

    modules = load_modules(Path(args.content_dir))

    async with async_session_factory() as db:
        org, teacher = await resolve_org_and_teacher(db, args.org_slug)
        course = await upsert_course(db, org, teacher)

        lesson_count = 0
        exercise_count = 0
        for m in modules:
            module_id = py_uuid(f"module-{m['slug']}")
            module = await db.get(Module, module_id)
            if module is None:
                module = Module(
                    id=module_id,
                    course_id=course.id,
                    title=m["title"],
                    sort_order=m["order"],
                )
                db.add(module)
                await db.flush()

            for i, lesson_spec in enumerate(m["lessons"]):
                await upsert_lesson(db, org, module, m["slug"], lesson_spec, i)
                lesson_count += 1
                exercise_count += len(lesson_spec.get("exercises", []))

        await db.commit()

        print(f"PY_COURSE_ID={course.id}")
        print(f"PY_MODULE_COUNT={len(modules)}")
        print(f"PY_LESSON_COUNT={lesson_count}")
        print(f"PY_EXERCISE_COUNT={exercise_count}")
        print(
            f"OK: course={COURSE_SLUG} modules={len(modules)} "
            f"lessons={lesson_count} exercises={exercise_count}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
