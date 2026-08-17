"""Seed a throwaway course for the exercise-type corner-case run.

Why this exists separately from `seed_qa.py`: the QA seed is what the Playwright
PR gate reads, and changing its data to suit an exploratory run risks breaking
other people's journeys. This script only adds — it never touches the QA course,
the QA lesson, or the QA exercises.

What it builds, in the same QA org so `qa-student` can already sign in:

    Course "Corner Cases"
      Module "All exercise types"
        Lesson per wave (5)          <- waves are ordered by risk, not by name
          Exercise per type, twice:
            V1  max_attempts = None  <- answers, and reload-mid-answer
            V2  max_attempts = 2     <- attempt exhaustion

Configs, questions and test cases are reused from `qa/exercise-fixtures.json`,
so every exercise here is actually solvable rather than an empty shell.

There is deliberately no third "deadline" variant. `Exercise` has `max_attempts`
but no student-facing deadline column — per-type timers live inside `config`
(the code_challenge `time_limit_seconds` is a sandbox limit, not a due date).
Inventing one here would have tested a field the product does not have.

Idempotent: every row keys off a deterministic uuid5, existing rows are left
alone. Safe to re-run after the other session resets the QA stack.

Usage, against a running QA stack:

    docker compose -f docker-compose.qa.yml exec -T backend \
        python scripts/seed_corner_cases.py
"""

from __future__ import annotations

import asyncio
import pathlib
import sys
import uuid

_HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))

# Importing seed_qa runs its bootstrap: sys.path for `app.*`, and the model
# imports SQLAlchemy needs before any mapper is configured. Its main() is
# behind a __main__ guard, so nothing is seeded by the import itself.
import seed_qa as qa  # noqa: E402

from app.courses.models import Course, CourseStatus, Lesson, Module  # noqa: E402
from app.exercises.models import Exercise, ExerciseType  # noqa: E402
from app.assessments.models import Question, QuestionType  # noqa: E402
from app.sandbox.models import TestCase  # noqa: E402
from app.db.session import async_session_factory  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

# Waves are ordered by how likely the renderer is to break, hardest first, so a
# run that gets stopped early has still covered the risky half.
WAVES: list[tuple[str, list[str]]] = [
    ("1. Drag and drop, canvas", [
        "matching", "ordering", "categorize",
        "crossword", "word_search", "map_pin_drop",
    ]),
    ("2. 3D and game levels", [
        "robot_2d", "world_3d", "stereometry", "math_interactive",
    ]),
    ("3. Code and maths", [
        "code_challenge", "web_editor", "math_stepwise", "math_system",
    ]),
    ("4. Languages", [
        "translation", "sentence_builder", "dialogue", "conjugation", "reading",
    ]),
    ("5. Plain and special", [
        "quiz", "true_false", "fill_blanks", "srs_flashcard",
        "bubble_sheet", "file_upload", "scorm_package",
    ]),
]

VARIANTS: list[tuple[str, int | None]] = [
    ("V1", None),   # answers + reload
    ("V2", 2),      # attempt exhaustion
]

CC_COURSE_ID = qa.qa_uuid("cc-course")
CC_MODULE_ID = qa.qa_uuid("cc-module")


def assert_waves_cover_every_type() -> None:
    """Fail loudly if a wave forgot a type, or names one that does not exist.

    Same reasoning as `assert_fixture_coverage` in seed_qa: a corner-case run
    that silently skips a type reads as coverage it does not have.
    """
    listed = [t for _, types in WAVES for t in types]
    dupes = {t for t in listed if listed.count(t) > 1}
    enum_types = {e.value for e in ExerciseType}
    missing = enum_types - set(listed)
    extra = set(listed) - enum_types
    if missing or extra or dupes:
        raise SystemExit(
            f"Wave mismatch: missing={sorted(missing)} "
            f"extra={sorted(extra)} duplicated={sorted(dupes)}"
        )


async def upsert_course(db: AsyncSession, org, teacher) -> Course:
    course = await db.get(Course, CC_COURSE_ID)
    if course:
        return course
    course = Course(
        id=CC_COURSE_ID,
        org_id=org.id,
        teacher_id=teacher.id,
        title="Corner Cases",
        slug="corner-cases",
        description="Throwaway course for the exercise-type corner-case run.",
        status=CourseStatus.published,
    )
    db.add(course)
    await db.flush()
    return course


async def upsert_module(db: AsyncSession, course: Course) -> Module:
    module = await db.get(Module, CC_MODULE_ID)
    if module:
        return module
    module = Module(
        id=CC_MODULE_ID,
        course_id=course.id,
        title="All exercise types",
        sort_order=0,
    )
    db.add(module)
    await db.flush()
    return module


async def upsert_wave_lesson(
    db: AsyncSession, module: Module, index: int, title: str
) -> Lesson:
    lesson_id = qa.qa_uuid(f"cc-lesson-{index}")
    lesson = await db.get(Lesson, lesson_id)
    if lesson:
        return lesson
    lesson = Lesson(
        id=lesson_id,
        module_id=module.id,
        title=title,
        sort_order=index,
    )
    db.add(lesson)
    await db.flush()
    return lesson


async def upsert_variant(
    db: AsyncSession,
    org,
    lesson: Lesson,
    fixture: dict,
    variant: str,
    max_attempts: int | None,
    sort_order: int,
) -> Exercise:
    ex_type = fixture["type"]
    ex_id = qa.qa_uuid(f"cc-exercise-{ex_type}-{variant}")
    existing = await db.get(Exercise, ex_id)
    if existing is not None:
        return existing

    attempts_note = "unlimited attempts" if max_attempts is None else f"{max_attempts} attempts"
    ex = Exercise(
        id=ex_id,
        lesson_id=lesson.id,
        org_id=org.id,
        # QA seeds use the QA- prefix; display_id is unique across the table.
        display_id=f"CC-{ex_type[:10].upper()}-{variant}",
        exercise_type=ExerciseType(ex_type),
        title=f"{fixture['label']} — {variant} ({attempts_note})",
        config=fixture.get("config", {}),
        sort_order=sort_order,
        max_attempts=max_attempts,
    )
    db.add(ex)
    await db.flush()

    for j, q_spec in enumerate(fixture.get("questions") or []):
        db.add(Question(
            id=qa.qa_uuid(f"cc-question-{ex_type}-{variant}-{j}"),
            exercise_id=ex.id,
            question_text=q_spec["question_text"],
            question_type=QuestionType(q_spec["question_type"]),
            options=q_spec.get("options"),
            correct_answer=q_spec.get("correct_answer"),
            points=q_spec.get("points", 1),
            sort_order=j,
        ))

    for k, tc_spec in enumerate(fixture.get("test_cases") or []):
        db.add(TestCase(
            id=qa.qa_uuid(f"cc-testcase-{ex_type}-{variant}-{k}"),
            exercise_id=ex.id,
            input=tc_spec.get("input", ""),
            expected_output=tc_spec["expected_output"],
            is_hidden=tc_spec.get("is_hidden", False),
            sort_order=k,
        ))

    await db.flush()
    return ex


async def main() -> int:
    qa.assert_fixture_coverage()
    assert_waves_cover_every_type()

    fixtures = {fx["type"]: fx for fx in qa.load_fixtures()}

    async with async_session_factory() as db:
        org = await qa.upsert_org(db)
        users = await qa.upsert_users(db, org)
        course = await upsert_course(db, org, users["qa-teacher"])
        module = await upsert_module(db, course)
        await qa.upsert_enrollment(db, course, users["qa-student"])

        total = 0
        lesson_ids: list[tuple[str, uuid.UUID]] = []
        for w, (wave_title, types) in enumerate(WAVES):
            lesson = await upsert_wave_lesson(db, module, w, wave_title)
            lesson_ids.append((wave_title, lesson.id))
            order = 0
            for ex_type in types:
                for variant, max_attempts in VARIANTS:
                    await upsert_variant(
                        db, org, lesson, fixtures[ex_type],
                        variant, max_attempts, order,
                    )
                    order += 1
                    total += 1

        await db.commit()

        print(f"CC_COURSE_ID={course.id}")
        for wave_title, lesson_id in lesson_ids:
            print(f"CC_LESSON[{wave_title}]={lesson_id}")
        print(f"CC_EXERCISE_COUNT={total}")
        print(f"OK: course={course.id} lessons={len(lesson_ids)} exercises={total}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
