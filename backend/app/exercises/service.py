import logging
import uuid
from datetime import datetime, timedelta, timezone
from fractions import Fraction
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.assessments.models import Question
from app.auth.models import Organization, User, UserRole
from app.common.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.common.file_validation import (
    SUBMISSION_EXTENSIONS,
    UploadValidationError,
    validate_upload,
)
from app.config import settings
from app.courses.lesson_blocks import remove_block_references
from app.courses.models import Course, Lesson, Module
from app.exercises.models import (
    EXERCISE_TYPE_PREFIX,
    Exercise,
    ExerciseSubmission,
    ExerciseType,
)
from app.sandbox.models import TestCase

logger = logging.getLogger(__name__)


# ─── Display ID generation ──────────────────────────────────────────


async def generate_display_id(
    db: AsyncSession, org_id: uuid.UUID, exercise_type: ExerciseType
) -> str:
    """Generate a human-readable display ID like 'myschool-Q001'."""
    import re

    # Get org slug
    result = await db.execute(select(Organization.slug).where(Organization.id == org_id))
    slug = result.scalar_one_or_none()
    if not slug:
        slug = "org"

    prefix = EXERCISE_TYPE_PREFIX.get(exercise_type.value, "X")
    pattern = f"{slug}-{prefix}"

    # Find the max existing number for this type+org to avoid collisions
    result = await db.execute(
        select(Exercise.display_id).where(
            Exercise.org_id == org_id,
            Exercise.exercise_type == exercise_type,
        )
    )
    existing_ids = [r[0] for r in result.all() if r[0]]
    max_num = 0
    for did in existing_ids:
        match = re.search(r"(\d+)$", did)
        if match:
            max_num = max(max_num, int(match.group(1)))

    return f"{pattern}{max_num + 1:03d}"


# ─── Helpers ─────────────────────────────────────────────────────────


def _check_permission(user: User) -> None:
    """Only admin, teacher, super_admin, and methodists can manage exercises."""
    if user.role in (UserRole.student, UserRole.parent):
        raise ForbiddenError("Only teachers and admins can manage exercises")


async def _get_exercise_with_relations(
    db: AsyncSession, exercise_id: uuid.UUID, user: User
) -> Exercise:
    """Fetch one exercise, refusing anything outside the caller's school.

    ``user`` is required rather than optional on purpose. This used to look up
    by id alone, and every path in this module goes through here — read,
    update, delete, questions, test cases, attempts, submissions, uploads. A
    teacher or admin holding another school's exercise id could therefore edit
    or delete that school's content, and any signed-in account could read it.
    ``list_exercises`` was scoped correctly, so the UI never offered those ids
    — but an id is not a secret, and it was never the access control.

    Cross-org reads as "not found", the same way the student profile and the
    class journal hide the existence of another school's rows.
    """
    result = await db.execute(
        select(Exercise)
        .where(Exercise.id == exercise_id)
        .options(
            selectinload(Exercise.questions),
            selectinload(Exercise.test_cases),
        )
    )
    exercise = result.scalar_one_or_none()
    if not exercise:
        raise NotFoundError("Exercise not found")
    if user.role != UserRole.super_admin and exercise.org_id != user.org_id:
        raise NotFoundError("Exercise not found")
    return exercise


# ─── CRUD ────────────────────────────────────────────────────────────


async def create_exercise(db: AsyncSession, user: User, data: dict) -> Exercise:
    _check_permission(user)

    lesson_id = data["lesson_id"]
    # Resolve org_id from lesson → module → course
    result = await db.execute(
        select(Course.org_id)
        .join(Module, Module.course_id == Course.id)
        .join(Lesson, Lesson.module_id == Module.id)
        .where(Lesson.id == lesson_id)
    )
    org_id = result.scalar_one_or_none()
    if not org_id:
        raise NotFoundError("Lesson not found")

    exercise_type = data["exercise_type"]
    if isinstance(exercise_type, str):
        exercise_type = ExerciseType(exercise_type)

    display_id = await generate_display_id(db, org_id, exercise_type)

    exercise = Exercise(
        lesson_id=lesson_id,
        org_id=org_id,
        display_id=display_id,
        exercise_type=exercise_type,
        title=data.get("title", "Untitled"),
        config=data.get("config", {}),
        sort_order=data.get("sort_order", 0),
        max_attempts=data.get("max_attempts"),
    )
    db.add(exercise)
    await db.flush()

    return await _get_exercise_with_relations(db, exercise.id, user)


async def get_exercise(db: AsyncSession, exercise_id: uuid.UUID, user: User) -> Exercise:
    exercise = await _get_exercise_with_relations(db, exercise_id, user)
    # Students shouldn't see correct answers in quiz questions
    return exercise


async def list_exercises(
    db: AsyncSession,
    user: User,
    exercise_type: ExerciseType | None = None,
    lesson_id: uuid.UUID | None = None,
    search: str | None = None,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[Exercise], int]:
    base_query = select(Exercise)

    # Scope by org for non-super admins
    if user.role != UserRole.super_admin:
        base_query = base_query.where(Exercise.org_id == user.org_id)

    if exercise_type:
        base_query = base_query.where(Exercise.exercise_type == exercise_type)
    if lesson_id:
        base_query = base_query.where(Exercise.lesson_id == lesson_id)
    if search:
        base_query = base_query.where(
            Exercise.title.ilike(f"%{search}%") | Exercise.display_id.ilike(f"%{search}%")
        )

    # Count
    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar() or 0

    # Paginated results
    result = await db.execute(
        base_query.options(selectinload(Exercise.questions), selectinload(Exercise.test_cases))
        .order_by(Exercise.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    exercises = list(result.scalars().unique().all())

    return exercises, total


async def get_exercises_by_lesson(
    db: AsyncSession, lesson_id: uuid.UUID, user: User
) -> list[Exercise]:
    """Exercises of one lesson, scoped like every other read here.

    Took no caller at all before, so a lesson id from another school listed
    that school's exercises to anyone signed in.
    """
    query = (
        select(Exercise)
        .where(Exercise.lesson_id == lesson_id)
        .options(selectinload(Exercise.questions), selectinload(Exercise.test_cases))
        .order_by(Exercise.sort_order)
    )
    if user.role != UserRole.super_admin:
        query = query.where(Exercise.org_id == user.org_id)
    result = await db.execute(query)
    return list(result.scalars().unique().all())


async def update_exercise(
    db: AsyncSession, exercise_id: uuid.UUID, user: User, data: dict
) -> Exercise:
    _check_permission(user)
    exercise = await _get_exercise_with_relations(db, exercise_id, user)

    for key, value in data.items():
        if value is not None and hasattr(exercise, key):
            setattr(exercise, key, value)

    await db.flush()
    return await _get_exercise_with_relations(db, exercise_id, user)


async def delete_exercise(db: AsyncSession, exercise_id: uuid.UUID, user: User) -> None:
    _check_permission(user)
    exercise = await _get_exercise_with_relations(db, exercise_id, user)
    # Before the delete, not after: the school is read off the exercise, and
    # after db.delete there is nothing to read it from. A lesson page holds
    # only a reference to this exercise; left behind, that reference points at
    # nothing and tells nobody — the pupil's player silently skips the block
    # and the teacher's editor shows it as a type that was never picked.
    await remove_block_references(db, exercise.org_id, "exercise", "exercise_id", exercise.id)
    await db.delete(exercise)
    await db.flush()


# ─── Question management ────────────────────────────────────────────


async def add_question_to_exercise(
    db: AsyncSession, exercise_id: uuid.UUID, user: User, data: dict
) -> Question:
    _check_permission(user)
    exercise = await _get_exercise_with_relations(db, exercise_id, user)

    max_order = (
        await db.execute(
            select(func.coalesce(func.max(Question.sort_order), -1)).where(
                Question.exercise_id == exercise_id
            )
        )
    ).scalar() or 0

    question = Question(
        exercise_id=exercise_id,
        sort_order=max_order + 1,
        **data,
    )
    db.add(question)
    await db.flush()

    result = await db.execute(select(Question).where(Question.id == question.id))
    return result.scalar_one()


async def _owning_exercise_of(
    db: AsyncSession, user: User, exercise_id: uuid.UUID | None, label: str
) -> None:
    """Apply the exercise's org rule to one of its child rows.

    Questions and test cases are addressed by their own id, so the guard on
    the exercise was being skipped entirely: a teacher elsewhere could rewrite
    a question, or bolt a test case onto another school's code challenge and
    change how that school's students are marked.
    """
    if exercise_id is None:
        raise NotFoundError(f"{label} not found")
    await _get_exercise_with_relations(db, exercise_id, user)


async def update_question_in_exercise(
    db: AsyncSession, question_id: uuid.UUID, user: User, data: dict
) -> Question:
    _check_permission(user)
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise NotFoundError("Question not found")
    await _owning_exercise_of(db, user, question.exercise_id, "Question")

    for key, value in data.items():
        if value is not None:
            setattr(question, key, value)

    await db.flush()
    return question


async def delete_question_from_exercise(
    db: AsyncSession, question_id: uuid.UUID, user: User
) -> None:
    _check_permission(user)
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise NotFoundError("Question not found")
    await _owning_exercise_of(db, user, question.exercise_id, "Question")
    await db.delete(question)
    await db.flush()


# ─── Test case management ───────────────────────────────────────────


async def add_test_case_to_exercise(
    db: AsyncSession, exercise_id: uuid.UUID, user: User, data: dict
) -> TestCase:
    _check_permission(user)
    # This one never loaded the exercise at all — it wrote a row keyed by
    # whatever id arrived, so a test case could be attached to another
    # school's code challenge.
    await _get_exercise_with_relations(db, exercise_id, user)

    max_order = (
        await db.execute(
            select(func.coalesce(func.max(TestCase.sort_order), -1)).where(
                TestCase.exercise_id == exercise_id
            )
        )
    ).scalar() or 0

    tc = TestCase(
        exercise_id=exercise_id,
        sort_order=max_order + 1,
        **data,
    )
    db.add(tc)
    await db.flush()

    result = await db.execute(select(TestCase).where(TestCase.id == tc.id))
    return result.scalar_one()


async def update_test_case_in_exercise(
    db: AsyncSession, test_case_id: uuid.UUID, user: User, data: dict
) -> TestCase:
    _check_permission(user)
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise NotFoundError("Test case not found")
    await _owning_exercise_of(db, user, tc.exercise_id, "Test case")
    for k, v in data.items():
        if hasattr(tc, k):
            setattr(tc, k, v)
    await db.flush()
    return tc


async def delete_test_case_from_exercise(
    db: AsyncSession, test_case_id: uuid.UUID, user: User
) -> None:
    _check_permission(user)
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise NotFoundError("Test case not found")
    await _owning_exercise_of(db, user, tc.exercise_id, "Test case")
    await db.delete(tc)
    await db.flush()


# ─── Attempt tracking helpers ──────────────────────────────────────


async def _count_attempts(db: AsyncSession, exercise_id: uuid.UUID, student_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count()).where(
            ExerciseSubmission.exercise_id == exercise_id,
            ExerciseSubmission.student_id == student_id,
        )
    )
    return result.scalar() or 0


async def _latest_submission(
    db: AsyncSession, exercise_id: uuid.UUID, student_id: uuid.UUID
) -> ExerciseSubmission | None:
    result = await db.execute(
        select(ExerciseSubmission)
        .where(
            ExerciseSubmission.exercise_id == exercise_id,
            ExerciseSubmission.student_id == student_id,
        )
        .order_by(ExerciseSubmission.submitted_at.desc())
        .limit(1)
    )
    return result.scalars().first()


# Cap time-on-task at 24h to drop garbage (clock skew, tab left open overnight).
_MAX_ELAPSED_SECONDS = 24 * 60 * 60


def _normalize_elapsed(raw) -> int | None:
    """Validate/clamp client-reported elapsed_seconds to [0, 24h]; None if absent/invalid."""
    if raw is None:
        return None
    try:
        secs = int(raw)
    except (TypeError, ValueError):
        return None
    if secs < 0:
        return 0
    return min(secs, _MAX_ELAPSED_SECONDS)


def _apply_timing(submission: ExerciseSubmission, data: dict, now: datetime) -> None:
    """Stamp attempt_number + time-on-task onto a submission before flush.

    Backward-compatible: when the client omits elapsed_seconds, started_at and
    time_spent_seconds stay NULL. attempt_number is always set (>=1) so methodist
    analytics can rely on it for new rows.
    """
    submission.attempt_number = data.get("_attempt_number")
    elapsed = _normalize_elapsed(data.get("elapsed_seconds"))
    if elapsed is not None:
        submission.time_spent_seconds = elapsed
        submission.started_at = now - timedelta(seconds=elapsed)


def _get_correct_answer(exercise: Exercise) -> dict | None:
    """Extract correct answer from exercise config for answer reveal."""
    config = exercise.config or {}
    ex_type = exercise.exercise_type

    if ex_type == ExerciseType.math_interactive:
        tc = config.get("template_config", config)
        tt = config.get("template_type", "")
        if tt == "multiple_choice_math":
            choices = tc.get("choices", [])
            for c in choices:
                if c.get("correct"):
                    return {"answer": c.get("text", ""), "explanation": tc.get("explanation", "")}
        elif tt == "numeric_input":
            answers = tc.get("correct_answers", [])
            return {
                "answer": answers[0] if answers else None,
                "explanation": tc.get("explanation", ""),
            }
        elif tt == "equation_solver":
            return {"answer": tc.get("final_answer", ""), "explanation": tc.get("explanation", "")}
        elif tt == "card_sort":
            cards = tc.get("cards", [])
            cats = tc.get("categories", [])
            cat_map = {c["id"]: c["label"] for c in cats}
            return {"answer": {c["text"]: cat_map.get(c["category"], c["category"]) for c in cards}}
        elif tt == "two_way_table":
            return {"answer": tc.get("answers", {}), "explanation": tc.get("explanation", "")}
        elif tt == "table_pattern":
            return {
                "answer": tc.get("answers", {}),
                "rule": tc.get("rule_answer", ""),
                "explanation": tc.get("explanation", ""),
            }
        elif tt == "scatter_plot":
            return {
                "answer": {"slope": tc.get("target_slope"), "intercept": tc.get("target_intercept")}
            }
        elif tt == "coordinate_plane":
            return {"answer": tc.get("target_points", [])}
        return {"explanation": tc.get("explanation", "")}

    elif ex_type == ExerciseType.quiz:
        questions = exercise.questions or []
        return {
            "answers": [
                {
                    "question": q.question_text,
                    "correct_answer": q.correct_answer,
                }
                for q in questions
            ]
        }

    elif ex_type == ExerciseType.math_system:
        # No stored key to read: the config a student receives holds only the
        # equations, so the answer is solved here as well as at marking time.
        from app.math_validation.service import MathParseError, solve_linear_system

        try:
            return {
                "answer": solve_linear_system(
                    config.get("equations") or [], config.get("variables") or []
                )
            }
        except MathParseError:
            return None

    elif ex_type == ExerciseType.stereometry:
        # Same reason as math_system: the student's config carries the solid
        # and its measurements, never the number they lead to.
        from app.math_validation.solids import SolidError, compute

        try:
            value = compute(
                config.get("solid") or "",
                config.get("dimensions") or {},
                config.get("quantity") or "",
            )
        except SolidError:
            return None
        return {"answer": round(value, _stereometry_places(config))}

    elif ex_type in (ExerciseType.matching,):
        return {"answer": config.get("pairs", [])}
    elif ex_type == ExerciseType.ordering:
        return {"answer": config.get("correct_order", [])}
    elif ex_type == ExerciseType.fill_blanks:
        return {"answer": config.get("blanks", [])}
    elif ex_type == ExerciseType.true_false:
        return {"answer": config.get("correct_answer")}

    return None


async def get_attempt_status(
    db: AsyncSession,
    exercise_id: uuid.UUID,
    user: User,
) -> dict:
    """Get current attempt count, remaining attempts, and last submission for a student."""
    exercise = await _get_exercise_with_relations(db, exercise_id, user)
    max_att = exercise.max_attempts if exercise.max_attempts is not None else 100
    count = await _count_attempts(db, exercise_id, user.id)
    remaining = max(0, max_att - count)

    # Fetch last submission for this student
    last_sub = None
    if count > 0:
        result = await db.execute(
            select(ExerciseSubmission)
            .where(
                ExerciseSubmission.exercise_id == exercise_id,
                ExerciseSubmission.student_id == user.id,
            )
            .order_by(ExerciseSubmission.submitted_at.desc())
            .limit(1)
        )
        sub = result.scalar_one_or_none()
        if sub:
            last_sub = {
                "score": sub.score,
                "passed": sub.passed,
                "status": sub.status,
                "answers": sub.answers,
            }

    return {
        "attempt_count": count,
        "max_attempts": max_att,
        "attempts_remaining": remaining,
        "max_reached": count >= max_att,
        "last_submission": last_sub,
    }


# ─── Unified submission handler ─────────────────────────────────────


async def submit_exercise(
    db: AsyncSession, exercise_id: uuid.UUID, user: User, data: dict
) -> ExerciseSubmission:
    exercise = await _get_exercise_with_relations(db, exercise_id, user)
    now = datetime.now(timezone.utc)

    # Check max attempts
    max_att = exercise.max_attempts if exercise.max_attempts is not None else 100
    attempt_count = await _count_attempts(db, exercise_id, user.id)

    # Stash the 1-based attempt number so each _submit_* helper can stamp it on
    # the row via _apply_timing (stored explicitly, not just computed on the fly).
    data["_attempt_number"] = attempt_count + 1

    if attempt_count >= max_att:
        # Max attempts reached. The student is told the correct answer and is let
        # through, which is deliberate — being stuck forever on one exercise is
        # worse than seeing the answer.
        #
        # What is NOT deliberate is writing a fresh row every time they press
        # submit again. That row carries score=0, and each one also bumps
        # attempt_count, so the limit never actually holds: a 2-attempt exercise
        # was measured accepting a 4th submission (2026-08-17 corner-case wave 1),
        # and a student who had scored 80 on their last real attempt could
        # overwrite it with a zero by clicking once more. Write the exhaustion row
        # once; every later press returns that same row.
        correct = _get_correct_answer(exercise)
        latest = await _latest_submission(db, exercise.id, user.id)
        if latest is not None and (latest.answers or {}).get("max_attempts_exhausted"):
            sub = await _reload_submission(db, latest.id)
            sub._attempt_number = attempt_count  # type: ignore[attr-defined]
            sub._attempts_remaining = 0  # type: ignore[attr-defined]
            sub._max_attempts_reached = True  # type: ignore[attr-defined]
            sub._correct_answer = correct  # type: ignore[attr-defined]
            return sub

        submission = ExerciseSubmission(
            exercise_id=exercise.id,
            student_id=user.id,
            answers={"max_attempts_exhausted": True},
            score=0,
            # Not passed. Running out of tries is not solving the exercise, and
            # this row is what the journal, the analytics mastery figure and the
            # student profile read: with True here, a class that gave up and a
            # class that solved the work came out as the same number (measured
            # across all 26 types, 2026-08-18). What lets the pupil move on is
            # the answer reveal and the exercise refusing further submissions,
            # not this field — nothing gates progression on it.
            passed=False,
            status="graded",
            submitted_at=now,
            graded_at=now,
        )
        _apply_timing(submission, data, now)
        db.add(submission)
        await db.flush()
        sub = await _reload_submission(db, submission.id)
        # Attach attempt info as extra attributes for the response serializer
        sub._attempt_number = attempt_count + 1  # type: ignore[attr-defined]
        sub._attempts_remaining = 0  # type: ignore[attr-defined]
        sub._max_attempts_reached = True  # type: ignore[attr-defined]
        sub._correct_answer = correct  # type: ignore[attr-defined]
        return sub

    if exercise.exercise_type == ExerciseType.quiz:
        return await _submit_quiz(db, exercise, user, data, now)
    elif exercise.exercise_type == ExerciseType.code_challenge:
        return await _submit_code(db, exercise, user, data, now)
    elif exercise.exercise_type == ExerciseType.file_upload:
        raise BadRequestError("Use the /upload endpoint for file submissions")
    elif exercise.exercise_type == ExerciseType.math_interactive:
        return await _submit_math_interactive(db, exercise, user, data, now)
    elif exercise.exercise_type in (
        ExerciseType.robot_2d,
        ExerciseType.world_3d,
    ):
        return await _submit_game_level(db, exercise, user, data, now)
    elif exercise.exercise_type == ExerciseType.web_editor:
        return await _submit_web_editor(db, exercise, user, data, now)
    elif exercise.exercise_type == ExerciseType.math_system:
        return await _submit_math_system(db, exercise, user, data, now)
    elif exercise.exercise_type == ExerciseType.stereometry:
        return await _submit_stereometry(db, exercise, user, data, now)
    elif exercise.exercise_type == ExerciseType.math_stepwise:
        return await _submit_math_stepwise(db, exercise, user, data, now)
    elif exercise.exercise_type in (
        ExerciseType.translation,
        ExerciseType.sentence_builder,
        ExerciseType.dialogue,
        ExerciseType.conjugation,
        ExerciseType.reading,
    ):
        return await _submit_interactive(db, exercise, user, data, now)
    else:
        # Interactive types: matching, ordering, fill_blanks, true_false, categorize
        return await _submit_interactive(db, exercise, user, data, now)


async def _submit_quiz(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    answers = data.get("answers", [])
    questions = exercise.questions or []

    # Grade
    from app.assessments.grading import grade_quiz

    score_percent, _ = grade_quiz(questions, answers)
    passing = exercise.config.get("passing_score", 70)
    passed = score_percent >= passing

    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        answers={"quiz_answers": answers},
        score=score_percent,
        passed=passed,
        status="graded",
        submitted_at=now,
        graded_at=now,
    )
    _apply_timing(submission, data, now)
    db.add(submission)
    await db.flush()

    if passed:
        await _award_xp(db, user.id, 25, "quiz_passed")

    return await _reload_submission(db, submission.id)


def _limit_message(limit_hit: str | None, *, seconds: int, megabytes: int) -> str | None:
    """What a pupil reads when an allowance stopped their program.

    The runner names the limit; without this the pupil sees only their runtime's
    own words — a MemoryError traceback, or nothing at all for a program that was
    simply stopped — and has to guess which of five allowances they hit.

    The numbers come from the exercise, not from a sentence written here, because
    an author who sets a 5-second limit and reads "longer than 10 seconds" learns
    the wrong thing about their own task.

    An unrecognised value gets the generic refusal rather than nothing:
    contracts/runner-api.md requires a caller to treat a limit it has never heard
    of as a refusal, so the runner can add one without every caller changing
    first.
    """
    if not limit_hit:
        return None
    known = {
        "time": f"Your program ran longer than {seconds} seconds.",
        "memory": f"Your program used more than {megabytes} MB of memory.",
        "processes": "Your program tried to start too many processes.",
        "output": "Your program printed more than we can show — the output was cut short.",
        "busy": "The class is busy right now. Try running your program again in a moment.",
    }
    return known.get(limit_hit, "Your program was stopped before it finished.")


async def _submit_code(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    source_code = data.get("source_code", "")
    language = data.get("language") or exercise.config.get("language", "python")
    test_cases = exercise.test_cases or []
    seconds = exercise.config.get("time_limit_seconds", 10)
    megabytes = exercise.config.get("memory_limit_mb", 256)

    from app.sandbox.executor import execute_code_remote

    total_tests = len(test_cases)
    total_passed = 0
    results = []

    for tc in test_cases:
        result = await execute_code_remote(
            language,
            source_code,
            tc.input,
            timeout_seconds=seconds,
            memory_limit_mb=megabytes,
        )
        actual = result.get("stdout", "").strip()
        expected = tc.expected_output.strip()
        # A limit that fired means the program did not finish, whatever it had
        # printed by then. Comparing text alone passed a program that printed
        # the right answer and then exhausted its memory — the pupil was told
        # they had solved it on a run that died.
        #
        # Any non-null value counts, including one this code has never heard of:
        # contracts/runner-api.md requires an unrecognised limit to be treated
        # as a refusal, so the runner can add one without every caller changing
        # first. Erring towards "not passed" is the safe direction; the
        # alternative marks work correct that was not.
        limit_hit = result.get("limit_hit")
        is_pass = actual == expected and not limit_hit

        if is_pass:
            total_passed += 1

        results.append(
            {
                "test_case_id": str(tc.id),
                "input": tc.input,
                "expected": expected,
                "actual": actual,
                "passed": is_pass,
                "is_hidden": tc.is_hidden,
                "status": result.get("status", "error"),
                "stderr": result.get("stderr", ""),
                "execution_time_ms": result.get("execution_time_ms", 0),
                # Which allowance stopped this run, and what to say about it.
                # Null on a run that finished on its own terms.
                "limit_hit": limit_hit,
                "limit_message": _limit_message(limit_hit, seconds=seconds, megabytes=megabytes),
            }
        )

    all_passed = total_passed == total_tests
    exec_time = max((r.get("execution_time_ms", 0) for r in results), default=0)
    status = "passed" if all_passed else "failed"

    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        source_code=source_code,
        language=language,
        status=status,
        total_passed=total_passed,
        total_tests=total_tests,
        execution_time_ms=exec_time,
        results={"test_results": results},
        score=round(total_passed / total_tests * 100, 2) if total_tests > 0 else 0,
        passed=all_passed,
        submitted_at=now,
        graded_at=now,
    )
    _apply_timing(submission, data, now)
    db.add(submission)
    await db.flush()

    if all_passed:
        await _award_xp(db, user.id, 50, "code_challenge_passed")

    return await _reload_submission(db, submission.id)


async def _submit_interactive(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    interactive_answers = data.get("interactive_answers") or data.get("answers", {})
    config = exercise.config or {}

    from app.submissions.service import grade_interactive_detail

    score, passed, per_item = grade_interactive_detail(
        config, exercise.exercise_type.value, interactive_answers
    )

    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        answers=interactive_answers,
        score=round(score * 100, 2),
        passed=passed,
        status="graded",
        submitted_at=now,
        graded_at=now,
    )
    _apply_timing(submission, data, now)
    db.add(submission)
    await db.flush()

    if passed:
        await _award_xp(db, user.id, 25, "exercise_passed")

    sub = await _reload_submission(db, submission.id)
    # Per-item verdicts ride along for the response serializer (booleans only,
    # never expected answers — see grade_interactive_detail).
    sub._per_item = per_item  # type: ignore[attr-defined]
    return sub


async def _submit_math_system(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    """Mark a system of linear equations.

    The server solves the system from the teacher's equations rather than
    comparing against a stored answer key: with integrity model B the config
    the student receives has no answer in it, and re-solving is cheaper than
    keeping a second copy of the truth in sync.

    A submission is `{"kind": "unique"|"none"|"infinite", "values": {...}}`.
    The two non-unique kinds are the point of the topic — a student has to
    recognise parallel lines and a repeated line, not just crank out numbers.
    """
    from app.math_validation.service import (
        MathParseError,
        solutions_match,
        solve_linear_system,
    )

    config = exercise.config or {}
    equations = config.get("equations") or []
    variables = config.get("variables") or []
    # interactive_answers, not answers: the submit schema types `answers` as a
    # list of per-question dicts, and this type sends one object.
    answer = data.get("interactive_answers") or {}

    try:
        expected = solve_linear_system(list(equations), list(variables))
    except MathParseError as e:
        # The exercise itself is broken, not the attempt. Refuse rather than
        # record a fail against the student for a config they cannot see.
        raise BadRequestError(f"This exercise is misconfigured: {e}")

    given = answer if isinstance(answer, dict) else {}
    passed = solutions_match(expected, given, list(variables))

    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        answers=given,
        score=100.0 if passed else 0.0,
        passed=passed,
        status="graded",
        submitted_at=now,
        graded_at=now,
    )
    _apply_timing(submission, data, now)
    db.add(submission)
    await db.flush()

    if passed:
        await _award_xp(db, user.id, 25, "exercise_passed")

    return await _reload_submission(db, submission.id)


async def _submit_math_stepwise(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    """Mark a step-by-step answer on the server.

    This type had no branch here at all: it fell through to `_submit_interactive`,
    and `grade_interactive` has no case for it either, so every submission scored
    zero and read as "not passed" — a student who solved it correctly was told they
    had failed. Measured across all 26 types on 2026-08-18.

    The client does compare the final answer while the student works, through
    /math-validation/check-answer, and posts its verdict as `correct`. That verdict
    is ignored here. It is a hint for the pupil, not evidence: anyone can post
    `correct: true`, and the server is the only judge of an answer.

    Steps are stored but not marked. Marking them needs a per-step equivalence
    check the product does not have yet; scoring a student down for a route the
    server cannot follow would be worse than not scoring it.
    """
    from app.math_validation.service import answers_match
    from app.submissions.service import warn_if_no_answer_key

    config = exercise.config or {}
    answer = data.get("interactive_answers") or {}
    if not isinstance(answer, dict):
        answer = {}
    given = str(answer.get("final_answer") or "")
    expected = str(config.get("final_answer") or "")

    warn_if_no_answer_key(config, exercise.exercise_type.value)
    # No expected answer: nothing to get wrong, which is what every other grader
    # answers in this case. The warning above is what makes it findable.
    passed = True if not expected.strip() else answers_match(given, expected)

    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        answers={"final_answer": given, "steps": answer.get("steps") or []},
        score=100.0 if passed else 0.0,
        passed=passed,
        status="graded",
        submitted_at=now,
        graded_at=now,
    )
    _apply_timing(submission, data, now)
    db.add(submission)
    await db.flush()

    if passed:
        await _award_xp(db, user.id, 25, "exercise_passed")

    return await _reload_submission(db, submission.id)


def _stereometry_places(config: dict) -> int:
    """How many decimals the answer is asked to. Default 2.

    Rounding is what makes a numeric answer markable at all: a cone's volume
    is irrational, and no student types 33.510321638291124.
    """
    raw = config.get("decimals", 2)
    if isinstance(raw, bool) or not isinstance(raw, int):
        return 2
    return max(0, min(6, raw))


async def _submit_stereometry(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    """Mark a solid-geometry answer.

    The server computes the expected number from the teacher's solid rather
    than comparing against a stored key — the config the student receives has
    no answer in it, and recomputing is cheaper than keeping a second copy of
    the truth in sync.

    The comparison is against the rounded value, so a student who rounds as
    asked is right, and one who answers to more places than asked is right
    too as long as they are inside the tolerance.
    """
    from app.math_validation.solids import SolidError, compute

    config = exercise.config or {}
    answer = data.get("interactive_answers") or {}
    given_raw = answer.get("value") if isinstance(answer, dict) else None

    try:
        exact = compute(
            config.get("solid") or "",
            config.get("dimensions") or {},
            config.get("quantity") or "",
        )
    except SolidError as e:
        # The exercise is broken, not the attempt. Refuse rather than record a
        # fail against a student for a config they cannot see.
        raise BadRequestError(f"This exercise is misconfigured: {e}")

    places = _stereometry_places(config)
    expected = round(exact, places)
    # Half a unit in the last requested place, so "round to 2 dp" accepts
    # 33.51 for 33.5103…, and a teacher can widen it deliberately.
    tolerance = config.get("tolerance")
    if isinstance(tolerance, bool) or not isinstance(tolerance, (int, float)):
        tolerance = 0.5 * 10 ** (-places)
    tolerance = abs(float(tolerance))

    passed = False
    if isinstance(given_raw, (int, float)) and not isinstance(given_raw, bool):
        passed = abs(float(given_raw) - expected) <= tolerance

    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        answers={"value": given_raw},
        score=100.0 if passed else 0.0,
        passed=passed,
        status="graded",
        submitted_at=now,
        graded_at=now,
    )
    _apply_timing(submission, data, now)
    db.add(submission)
    await db.flush()

    if passed:
        await _award_xp(db, user.id, 25, "exercise_passed")

    return await _reload_submission(db, submission.id)


async def upload_file_submission(
    db: AsyncSession,
    exercise_id: uuid.UUID,
    user: User,
    file: UploadFile,
) -> ExerciseSubmission:
    exercise = await _get_exercise_with_relations(db, exercise_id, user)
    if exercise.exercise_type != ExerciseType.file_upload:
        raise BadRequestError("This exercise does not accept file uploads")

    config = exercise.config or {}
    now = datetime.now(timezone.utc)

    # Validate with shared helper (extension, size, magic bytes, safe name)
    raw = await file.read()
    allowed_types = config.get("allowed_types", list(SUBMISSION_EXTENSIONS))
    max_mb = config.get("max_file_mb", settings.max_upload_mb)
    try:
        validated = validate_upload(
            filename=file.filename,
            data=raw,
            allowed_extensions=allowed_types,
            max_size_mb=max_mb,
        )
    except UploadValidationError as e:
        raise BadRequestError(str(e)) from e

    original = file.filename or validated.safe_name
    stored_name = validated.safe_name
    upload_dir = Path(settings.upload_dir) / str(exercise.org_id) / str(exercise_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / stored_name

    with open(file_path, "wb") as f:
        f.write(validated.data)

    submission = ExerciseSubmission(
        exercise_id=exercise_id,
        student_id=user.id,
        status="submitted",
        original_filename=original,
        stored_filename=stored_name,
        file_path=str(file_path),
        file_size=validated.size,
        mime_type=validated.verified_mime,
        submitted_at=now,
    )
    # File uploads use a separate multipart endpoint with no elapsed_seconds, so
    # only attempt_number is recorded here (time-on-task stays NULL by design).
    submission.attempt_number = await _count_attempts(db, exercise_id, user.id) + 1
    db.add(submission)
    await db.flush()

    return await _reload_submission(db, submission.id)


# ─── Submission queries ──────────────────────────────────────────────


async def list_submissions(
    db: AsyncSession,
    exercise_id: uuid.UUID,
    user: User,
    page: int = 1,
    per_page: int = 50,
) -> tuple[list[ExerciseSubmission], int]:
    base = select(ExerciseSubmission).where(ExerciseSubmission.exercise_id == exercise_id)

    # Students see only their own
    if user.role == UserRole.student:
        base = base.where(ExerciseSubmission.student_id == user.id)

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar() or 0

    result = await db.execute(
        base.order_by(ExerciseSubmission.submitted_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = list(result.scalars().all())

    return items, total


# ─── Game Level Submission ────────────────────────────────────────────

# Only robot_2d pays out: it is the one game type the server marks. The
# math_interactive and world_3d rates lived here too and were paid on the
# browser's own claim of completion, so they went when the claim stopped
# counting. They come back with the marking.
GAME_XP = {
    ExerciseType.robot_2d: 30,
    # Same award. A 3D level is not harder for being three-dimensional, and
    # paying more for it would push teachers towards it for the wrong reason.
    ExerciseType.world_3d: 30,
}


async def _submit_robot(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    """Grade a robot level by running the program, here, ourselves.

    Nothing the client says about the outcome is read. It used to be: this
    endpoint stored ``completed`` and ``score`` straight off the request body, so
    a pupil could post ``{"completed": true, "score": 1.0}`` without ever opening
    the exercise. That is Constitution III — the server is the only judge of an
    answer — and the half of `specs/004-exercise-answer-leak` that was deferred
    rather than fixed.

    A losing program is still recorded and still spends an attempt. The pupil
    pressed Submit; that is what Submit means. Running is free.
    """
    from fastapi import HTTPException

    from app.exercises import robot_runner

    payload = data.get("robot")
    if not isinstance(payload, dict):
        raise BadRequestError("robot is required for robot levels")

    source = (payload.get("source") or "").strip()
    if not source:
        raise BadRequestError("robot.source is required")

    try:
        run = await robot_runner.run(exercise.config or {}, source)
    except RuntimeError:
        # Nothing recorded, no attempt consumed — the pupil's work is intact and
        # they can press Submit again once the runner is back.
        raise HTTPException(
            status_code=503,
            detail="The service that runs programs is unavailable. Try again.",
        ) from None

    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        answers={
            "robot": {
                "source": source,
                "mode": payload.get("mode", "python"),
                # Everything below is the server's own figure, from the server's
                # own replay.
                "won": run["won"],
                "steps": run["steps"],
                "size": run["size"],
                "stars": run["stars"],
            }
        },
        score=run["stars"] / 3 * 100,
        passed=run["won"],
        status="graded",
        submitted_at=now,
        graded_at=now,
    )
    _apply_timing(submission, data, now)
    db.add(submission)
    await db.flush()

    if run["won"]:
        await _award_xp(db, user.id, GAME_XP[ExerciseType.robot_2d], "robot_2d_completed")

    return await _reload_submission(db, submission.id)


async def _submit_world(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    """Grade a 3D level by running the program, here, ourselves.

    The 2D twin is ``_submit_robot`` directly above, and the reasoning is
    identical: nothing the client says about the outcome is read. This endpoint
    used to store ``completed`` and ``score`` straight off the request body, so a
    pupil could post ``{"completed": true, "score": 1.0}`` without ever opening
    the exercise. That is Constitution III — the server is the only judge of an
    answer — and the last of `specs/004-exercise-answer-leak`.

    A losing program is still recorded and still spends an attempt. The pupil
    pressed Submit; that is what Submit means. Running is free.
    """
    from fastapi import HTTPException

    from app.exercises import robot_runner, world_sim

    payload = data.get("world")
    if not isinstance(payload, dict):
        raise BadRequestError("world is required for 3D levels")

    source = (payload.get("source") or "").strip()
    if not source:
        raise BadRequestError("world.source is required")

    try:
        run = await robot_runner.run(exercise.config or {}, source, sim=world_sim)
    except RuntimeError:
        # Nothing recorded, no attempt consumed — the pupil's work is intact and
        # they can press Submit again once the runner is back.
        raise HTTPException(
            status_code=503,
            detail="The service that runs programs is unavailable. Try again.",
        ) from None

    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        answers={
            "world": {
                "source": source,
                "mode": payload.get("mode", "python"),
                # Everything below is the server's own figure, from the server's
                # own replay.
                "won": run["won"],
                "steps": run["steps"],
                "size": run["size"],
                "stars": run["stars"],
            }
        },
        score=run["stars"] / 3 * 100,
        passed=run["won"],
        status="graded",
        submitted_at=now,
        graded_at=now,
    )
    _apply_timing(submission, data, now)
    db.add(submission)
    await db.flush()

    if run["won"]:
        await _award_xp(db, user.id, GAME_XP[ExerciseType.world_3d], "world_3d_completed")

    return await _reload_submission(db, submission.id)


def _mark_coordinate_plane(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark a coordinate plane the way its widget does, or decline.

    The widget compares each placed point with the one the teacher named, within a
    tolerance that defaults to 0.5, and calls it solved only when every point is
    right (`coordinate-plane.tsx`). The same rule has to hold here, or a pupil is
    marked one way while they work and another way when they submit.

    Returns None when there is nothing to mark - no targets, or no points sent -
    so the caller can record the attempt unmarked instead of inventing a verdict.
    """
    targets = template_config.get("target_points") or []
    points = work.get("points")
    if not targets or not isinstance(points, list):
        return None

    tolerance = template_config.get("tolerance")
    if isinstance(tolerance, bool) or not isinstance(tolerance, (int, float)):
        tolerance = 0.5
    tolerance = abs(float(tolerance))

    correct = 0
    for i, target in enumerate(targets):
        if i >= len(points) or not isinstance(points[i], dict):
            continue
        try:
            dx = abs(float(points[i].get("x", 0)) - float(target.get("x", 0)))
            dy = abs(float(points[i].get("y", 0)) - float(target.get("y", 0)))
        except (TypeError, ValueError):
            continue
        if dx <= tolerance and dy <= tolerance:
            correct += 1

    return correct / len(targets), correct == len(targets)


def _mark_numeric_input(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark a typed number the way `numeric-input.tsx` does.

    Any of `correct_answers` within `tolerance`, which defaults to 0.01 in the
    widget. A fraction is accepted because the widget accepts one; anything that
    is not a number at all is a wrong answer rather than a refusal, since the
    pupil did answer.
    """
    accepted = template_config.get("correct_answers")
    if not isinstance(accepted, list) or not accepted:
        return None
    if "value" not in work:
        return None

    tolerance = template_config.get("tolerance")
    if isinstance(tolerance, bool) or not isinstance(tolerance, (int, float)):
        tolerance = 0.01
    tolerance = abs(float(tolerance))

    raw = str(work.get("value") or "").strip()
    given: float | None = None
    try:
        given = float(Fraction(raw)) if "/" in raw else float(raw)
    except (ValueError, ZeroDivisionError):
        given = None
    if given is None:
        return 0.0, False

    for candidate in accepted:
        try:
            if abs(given - float(candidate)) <= tolerance:
                return 1.0, True
        except (TypeError, ValueError):
            continue
    return 0.0, False


def _mark_multiple_choice_math(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark a picked option against `choices[].correct`, as the widget does."""
    choices = template_config.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    if "choice" not in work:
        return None

    picked = work.get("choice")
    if not isinstance(picked, int) or isinstance(picked, bool):
        return 0.0, False
    if not 0 <= picked < len(choices):
        return 0.0, False
    chosen = choices[picked]
    correct = bool(isinstance(chosen, dict) and chosen.get("correct"))
    return (1.0, True) if correct else (0.0, False)


def _mark_number_line(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark markers dropped on a number line, as `number-line.tsx` does.

    Each marker within `tolerance` of its target, default 0.3 in the widget, and
    solved only when every one lands.
    """
    targets = template_config.get("targets")
    markers = work.get("markers")
    if not isinstance(targets, list) or not targets or not isinstance(markers, list):
        return None

    tolerance = template_config.get("tolerance")
    if isinstance(tolerance, bool) or not isinstance(tolerance, (int, float)):
        tolerance = 0.3
    tolerance = abs(float(tolerance))

    correct = 0
    for i, target in enumerate(targets):
        if i >= len(markers):
            continue
        try:
            if abs(float(markers[i]) - float(target)) <= tolerance:
                correct += 1
        except (TypeError, ValueError):
            continue
    return correct / len(targets), correct == len(targets)


def _mark_card_sort(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark cards dropped into buckets against the category each card names.

    `card-sort.tsx` counts a card correct when it sits in the category its own
    `category` field names, and calls the task solved only when every card does -
    a card left unsorted counts as wrong, which falls out of the same arithmetic
    here because it is absent from the placements.
    """
    cards = template_config.get("cards")
    placements = work.get("placements")
    if not isinstance(cards, list) or not cards or not isinstance(placements, dict):
        return None

    correct = 0
    for card in cards:
        if not isinstance(card, dict):
            continue
        card_id = str(card.get("id", ""))
        if card_id and placements.get(card_id) == card.get("category"):
            correct += 1
    return correct / len(cards), correct == len(cards)


def _mark_table_pattern(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark the blanks in a function table, and the rule if one is asked for.

    `table-pattern.tsx` counts one point per blank cell, matched against
    `answers[index]` within `tolerance` (0.01 by default), plus one for the rule
    when `rule_label` and `rule_answer` are both set - compared with whitespace
    and case removed, exactly as the widget compares it.
    """
    answers = template_config.get("answers")
    if not isinstance(answers, dict) or not answers:
        return None
    cells = work.get("cells")
    if not isinstance(cells, dict):
        return None

    tolerance = template_config.get("tolerance")
    if isinstance(tolerance, bool) or not isinstance(tolerance, (int, float)):
        tolerance = 0.01
    tolerance = abs(float(tolerance))

    total = 0
    correct = 0
    for index, expected in answers.items():
        total += 1
        raw = cells.get(str(index), cells.get(index))
        try:
            if raw is not None and abs(float(raw) - float(expected)) <= tolerance:
                correct += 1
        except (TypeError, ValueError):
            continue

    rule_answer = template_config.get("rule_answer")
    if template_config.get("rule_label") and rule_answer:
        total += 1
        given = str(work.get("rule") or "")
        if _squashed(given) == _squashed(str(rule_answer)):
            correct += 1

    if total == 0:
        return None
    return correct / total, correct == total


def _squashed(text: str) -> str:
    """Lower-case with every space removed, the way the widget compares a rule."""
    return "".join(text.split()).lower()


def _mark_two_way_table(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark the blanks of a two-way table against `answers["rNcM"]`.

    Whole numbers, compared exactly - `two-way-table.tsx` parses with parseInt and
    tests equality, and a frequency table has no business with tolerances.
    """
    answers = template_config.get("answers")
    cells = work.get("cells")
    if not isinstance(answers, dict) or not answers or not isinstance(cells, dict):
        return None

    correct = 0
    for key, expected in answers.items():
        raw = cells.get(str(key))
        try:
            if raw is not None and int(raw) == int(expected):
                correct += 1
        except (TypeError, ValueError):
            continue
    return correct / len(answers), correct == len(answers)


def _mark_visual_fractions(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark how many parts were shaded against the target numerator.

    `visual-fractions.tsx` asks for a fraction of a whole and checks the count of
    selected parts, not which ones - shading any three eighths is three eighths.
    """
    target = template_config.get("target_numerator")
    if not isinstance(target, int) or isinstance(target, bool):
        return None
    if "selected" not in work:
        return None

    selected = work.get("selected")
    count = len(selected) if isinstance(selected, list) else selected
    if not isinstance(count, int) or isinstance(count, bool):
        return 0.0, False
    return (1.0, True) if count == target else (0.0, False)


def _tolerant(template_config: dict, default: float) -> float:
    raw = template_config.get("tolerance")
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        raw = default
    return abs(float(raw))


def _mark_graph_transform(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark the three sliders of a transformed parent function.

    `graph-transform.tsx` scores one third per parameter within `tolerance`
    (0.3 by default) and calls it solved only when all three land.
    """
    wanted = {k: template_config.get(f"target_{k}") for k in ("h", "v", "a")}
    if all(v is None for v in wanted.values()):
        return None
    if not any(k in work for k in ("h", "v", "a")):
        return None

    tolerance = _tolerant(template_config, 0.3)
    defaults = {"h": 2, "v": -1, "a": 1}
    hits = 0
    for key, target in wanted.items():
        target = defaults[key] if target is None else target
        try:
            if abs(float(work.get(key, 0)) - float(target)) <= tolerance:
                hits += 1
        except (TypeError, ValueError):
            continue
    return hits / 3, hits == 3


def _mark_inequality_graph(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark the line and the shaded half-plane.

    `inequality-graph.tsx` scores slope, intercept and which side is shaded, one
    third each, within `tolerance` (0.4 by default). The operator and the dashed
    line are shown but not scored there, so they are not scored here either.
    """
    if not any(k in template_config for k in ("slope", "intercept", "operator")):
        return None
    if not any(k in work for k in ("slope", "intercept", "side")):
        return None

    tolerance = _tolerant(template_config, 0.4)
    operator = str(template_config.get("operator") or ">=")
    wanted_side = "above" if operator in (">", ">=") else "below"

    hits = 0
    for key, default in (("slope", 1), ("intercept", 0)):
        target = template_config.get(key, default)
        try:
            if abs(float(work.get(key, 0)) - float(target)) <= tolerance:
                hits += 1
        except (TypeError, ValueError):
            continue
    if str(work.get("side") or "") == wanted_side:
        hits += 1
    return hits / 3, hits == 3


def _mark_arithmetic_puzzle(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark the blank in each equation against its own `answer`.

    `arithmetic-puzzle.tsx` parses each entry as a whole number and compares it
    with `equations[i].answer`, and only calls the puzzle solved when every row
    is right. The legacy `rows` shape is converted in the widget before this key
    exists, so a config carrying only `rows` is declined rather than guessed at.
    """
    equations = template_config.get("equations")
    values = work.get("values")
    if not isinstance(equations, list) or not equations or not isinstance(values, dict):
        return None

    correct = 0
    for i, equation in enumerate(equations):
        if not isinstance(equation, dict):
            continue
        raw = values.get(str(i), values.get(i))
        try:
            if raw is not None and int(raw) == int(equation.get("answer")):
                correct += 1
        except (TypeError, ValueError):
            continue
    return correct / len(equations), correct == len(equations)


def _mark_venn_diagram(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark the blank regions against `answers[region]`, whole numbers, exactly.

    `venn-diagram.tsx` accepts `both` as an alias for `intersection`, so the same
    aliasing happens here or a pupil answering a legacy exercise is marked wrong
    for the config's spelling.
    """
    answers = template_config.get("answers")
    regions = work.get("regions")
    if not isinstance(answers, dict) or not answers or not isinstance(regions, dict):
        return None

    def alias(key: str) -> str:
        return "intersection" if key == "both" else key

    given = {alias(str(k)): v for k, v in regions.items()}
    correct = 0
    for key, expected in answers.items():
        raw = given.get(alias(str(key)))
        try:
            if raw is not None and int(raw) == int(expected):
                correct += 1
        except (TypeError, ValueError):
            continue
    return correct / len(answers), correct == len(answers)


def _mark_equation_balance(template_config: dict, work: dict) -> tuple[float, bool] | None:
    """Mark a balanced scale: the two sides have to come out equal.

    `equation-balance.tsx` sums the fixed terms with whatever the pupil added to
    each side and calls it solved when the sums match. It scores nothing partial,
    and neither does this - a scale is level or it is not.
    """
    left_fixed = template_config.get("left_fixed")
    right_fixed = template_config.get("right_fixed")
    if not isinstance(left_fixed, list) or not isinstance(right_fixed, list):
        return None
    if "left_added" not in work and "right_added" not in work:
        return None

    def total(fixed: list, added: object) -> float | None:
        out = 0.0
        for value in list(fixed) + (added if isinstance(added, list) else []):
            try:
                out += float(value)
            except (TypeError, ValueError):
                return None
        return out

    left = total(left_fixed, work.get("left_added"))
    right = total(right_fixed, work.get("right_added"))
    if left is None or right is None:
        return 0.0, False
    balanced = abs(left - right) < 1e-9
    return (1.0, True) if balanced else (0.0, False)


async def _submit_math_interactive(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    """Mark a maths widget here, for the templates the server understands.

    One template understands itself so far - the coordinate plane, the only one
    with content behind it in production (spec 012 counted). Everything else keeps
    the behaviour from #352: the attempt is recorded with the pupil's own report
    and marked by nobody, because a verdict from the page the pupil controls is
    not evidence.
    """
    config = exercise.config or {}
    template_config = config.get("template_config") or {}
    work = data.get("interactive_answers")
    if not isinstance(work, dict):
        work = {}

    # Templates the server understands. The rest keep the honest interim from
    # #352: recorded with the pupil's report, marked by nobody. `equation_solver`
    # is deliberately absent — its score depends on hints taken and wrong turns
    # made in the page, which the server cannot see and should not invent.
    markers = {
        "coordinate_plane": _mark_coordinate_plane,
        "numeric_input": _mark_numeric_input,
        "multiple_choice_math": _mark_multiple_choice_math,
        "number_line": _mark_number_line,
        "card_sort": _mark_card_sort,
        "table_pattern": _mark_table_pattern,
        "two_way_table": _mark_two_way_table,
        "visual_fractions": _mark_visual_fractions,
        "graph_transform": _mark_graph_transform,
        "inequality_graph": _mark_inequality_graph,
        "arithmetic_puzzle": _mark_arithmetic_puzzle,
        "venn_diagram": _mark_venn_diagram,
        "equation_balance": _mark_equation_balance,
    }
    marker = markers.get(str(config.get("template_type") or ""))
    marked = marker(template_config, work) if marker else None

    if marked is None:
        return await _submit_game_level(db, exercise, user, data, now)

    score, passed = marked
    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        answers=work,
        score=round(score * 100, 2),
        passed=passed,
        status="graded",
        submitted_at=now,
        graded_at=now,
    )
    _apply_timing(submission, data, now)
    db.add(submission)
    await db.flush()

    if passed:
        await _award_xp(db, user.id, 25, "math_interactive_completed")

    return await _reload_submission(db, submission.id)


async def _submit_game_level(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    # robot_2d and world_3d are graded server-side; the rest still post their own
    # verdict. `math_interactive` stays on this path deliberately — it is out of
    # scope here, and remains tracked by 004.
    if exercise.exercise_type == ExerciseType.robot_2d:
        return await _submit_robot(db, exercise, user, data, now)
    if exercise.exercise_type == ExerciseType.world_3d:
        return await _submit_world(db, exercise, user, data, now)

    game_result = data.get("game_result")
    if not game_result or not isinstance(game_result, dict):
        raise BadRequestError("game_result is required for game level exercises")

    # What the browser says happened. Kept as the pupil's own report — the steps
    # they took, how long it took them, the code they had at the end — because a
    # teacher marking this by hand wants exactly that.
    reported = {
        "completed": bool(game_result.get("completed", False)),
        "score": game_result.get("score", 0.0),
        "steps_used": game_result.get("steps_used", 0),
        "time_seconds": game_result.get("time_seconds", 0),
        "code_snapshot": game_result.get("code_snapshot"),
        "replay_log": game_result.get("replay_log"),
    }

    # It is not a mark, and it never was evidence. `completed` and `score` came
    # straight off the request body: posting {"completed": true, "score": 1.0}
    # scored 100 without the exercise being opened at all — measured on the QA
    # stack, 2026-08-18, and the half of specs/004-exercise-answer-leak that was
    # deferred rather than fixed. robot_2d closed it by having the server replay
    # the pupil's program (#343); these two cannot yet, so the attempt is
    # recorded for the teacher and marked by nobody. An unmarked submission is
    # honest; a forged pass is not.
    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        answers={"game_result": reported},
        score=None,
        passed=None,
        status="submitted",
        submitted_at=now,
    )
    _apply_timing(submission, data, now)
    db.add(submission)
    await db.flush()

    # No XP either: it was paid out on the same unverifiable claim.
    return await _reload_submission(db, submission.id)


# ─── Web Editor ────────────────────────────────────────────────────────


async def _submit_web_editor(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    web_code = data.get("web_code")
    if not web_code or not isinstance(web_code, dict):
        raise BadRequestError("web_code is required for web editor exercises")

    html_code = web_code.get("html", "")
    css_code = web_code.get("css", "")
    js_code = web_code.get("js", "")

    # Store as submitted — no auto-grading; teacher reviews manually
    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        answers={
            "html": html_code,
            "css": css_code,
            "js": js_code,
        },
        source_code=html_code,  # primary code for review queue display
        language="html",
        score=None,
        passed=None,
        status="submitted",
        submitted_at=now,
    )
    _apply_timing(submission, data, now)
    db.add(submission)
    await db.flush()

    await _award_xp(db, user.id, 15, "web_editor_submitted")

    return await _reload_submission(db, submission.id)


# ─── Helpers ─────────────────────────────────────────────────────────


async def _reload_submission(db: AsyncSession, sid: uuid.UUID) -> ExerciseSubmission:
    result = await db.execute(select(ExerciseSubmission).where(ExerciseSubmission.id == sid))
    return result.scalar_one()


async def _award_xp(db: AsyncSession, user_id: uuid.UUID, amount: int, reason: str) -> None:
    try:
        from app.gamification.service import award_xp

        await award_xp(db, user_id, amount, reason)
    except Exception:
        logger.warning("XP award failed for user %s (reason=%s)", user_id, reason, exc_info=True)
