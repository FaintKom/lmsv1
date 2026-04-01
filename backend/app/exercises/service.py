import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.assessments.models import Question
from app.auth.models import Organization, User, UserRole
from app.common.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.config import settings
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


async def _get_exercise_with_relations(db: AsyncSession, exercise_id: uuid.UUID) -> Exercise:
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

    return await _get_exercise_with_relations(db, exercise.id)


async def get_exercise(db: AsyncSession, exercise_id: uuid.UUID, user: User) -> Exercise:
    exercise = await _get_exercise_with_relations(db, exercise_id)
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
    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar() or 0

    # Paginated results
    result = await db.execute(
        base_query
        .options(selectinload(Exercise.questions), selectinload(Exercise.test_cases))
        .order_by(Exercise.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    exercises = list(result.scalars().unique().all())

    return exercises, total


async def get_exercises_by_lesson(
    db: AsyncSession, lesson_id: uuid.UUID
) -> list[Exercise]:
    result = await db.execute(
        select(Exercise)
        .where(Exercise.lesson_id == lesson_id)
        .options(selectinload(Exercise.questions), selectinload(Exercise.test_cases))
        .order_by(Exercise.sort_order)
    )
    return list(result.scalars().unique().all())


async def update_exercise(
    db: AsyncSession, exercise_id: uuid.UUID, user: User, data: dict
) -> Exercise:
    _check_permission(user)
    exercise = await _get_exercise_with_relations(db, exercise_id)

    for key, value in data.items():
        if value is not None and hasattr(exercise, key):
            setattr(exercise, key, value)

    await db.flush()
    return await _get_exercise_with_relations(db, exercise_id)


async def delete_exercise(db: AsyncSession, exercise_id: uuid.UUID, user: User) -> None:
    _check_permission(user)
    exercise = await _get_exercise_with_relations(db, exercise_id)
    await db.delete(exercise)
    await db.flush()


# ─── Question management ────────────────────────────────────────────

async def add_question_to_exercise(
    db: AsyncSession, exercise_id: uuid.UUID, user: User, data: dict
) -> Question:
    _check_permission(user)
    exercise = await _get_exercise_with_relations(db, exercise_id)

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


async def update_question_in_exercise(
    db: AsyncSession, question_id: uuid.UUID, user: User, data: dict
) -> Question:
    _check_permission(user)
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise NotFoundError("Question not found")

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
    await db.delete(question)
    await db.flush()


# ─── Test case management ───────────────────────────────────────────

async def add_test_case_to_exercise(
    db: AsyncSession, exercise_id: uuid.UUID, user: User, data: dict
) -> TestCase:
    _check_permission(user)

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


async def delete_test_case_from_exercise(
    db: AsyncSession, test_case_id: uuid.UUID, user: User
) -> None:
    _check_permission(user)
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    tc = result.scalar_one_or_none()
    if not tc:
        raise NotFoundError("Test case not found")
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
            return {"answer": answers[0] if answers else None, "explanation": tc.get("explanation", "")}
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
            return {"answer": tc.get("answers", {}), "rule": tc.get("rule_answer", ""), "explanation": tc.get("explanation", "")}
        elif tt == "scatter_plot":
            return {"answer": {"slope": tc.get("target_slope"), "intercept": tc.get("target_intercept")}}
        elif tt == "coordinate_plane":
            return {"answer": tc.get("target_points", [])}
        return {"explanation": tc.get("explanation", "")}

    elif ex_type == ExerciseType.quiz:
        questions = exercise.questions or []
        return {"answers": [{
            "question": q.question_text,
            "correct_answer": q.correct_answer,
        } for q in questions]}

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
    db: AsyncSession, exercise_id: uuid.UUID, user: User,
) -> dict:
    """Get current attempt count and remaining attempts for a student."""
    exercise = await _get_exercise_with_relations(db, exercise_id)
    max_att = exercise.max_attempts if exercise.max_attempts is not None else 100
    count = await _count_attempts(db, exercise_id, user.id)
    remaining = max(0, max_att - count)
    return {
        "attempt_count": count,
        "max_attempts": max_att,
        "attempts_remaining": remaining,
        "max_reached": count >= max_att,
    }


# ─── Unified submission handler ─────────────────────────────────────

async def submit_exercise(
    db: AsyncSession, exercise_id: uuid.UUID, user: User, data: dict
) -> ExerciseSubmission:
    exercise = await _get_exercise_with_relations(db, exercise_id)
    now = datetime.now(timezone.utc)

    # Check max attempts
    max_att = exercise.max_attempts if exercise.max_attempts is not None else 100
    attempt_count = await _count_attempts(db, exercise_id, user.id)

    if attempt_count >= max_att:
        # Max attempts reached — create a "completed" submission with correct answer
        correct = _get_correct_answer(exercise)
        submission = ExerciseSubmission(
            exercise_id=exercise.id,
            student_id=user.id,
            answers={"max_attempts_exhausted": True},
            score=0,
            passed=True,  # Mark as passed so student can proceed
            status="graded",
            submitted_at=now,
            graded_at=now,
        )
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
    elif exercise.exercise_type in (
        ExerciseType.robot_2d, ExerciseType.math_interactive, ExerciseType.world_3d
    ):
        return await _submit_game_level(db, exercise, user, data, now)
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
    db.add(submission)
    await db.flush()

    if passed:
        await _award_xp(db, user.id, 25, "quiz_passed")

    return await _reload_submission(db, submission.id)


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

    from app.sandbox.executor import execute_code_remote

    total_tests = len(test_cases)
    total_passed = 0
    results = []

    for tc in test_cases:
        result = await execute_code_remote(
            language,
            source_code,
            tc.input,
            timeout_seconds=exercise.config.get("time_limit_seconds", 10),
            memory_limit_mb=exercise.config.get("memory_limit_mb", 256),
        )
        actual = result.get("stdout", "").strip()
        expected = tc.expected_output.strip()
        is_pass = actual == expected

        if is_pass:
            total_passed += 1

        results.append({
            "test_case_id": str(tc.id),
            "input": tc.input,
            "expected": expected,
            "actual": actual,
            "passed": is_pass,
            "is_hidden": tc.is_hidden,
            "status": result.get("status", "error"),
            "stderr": result.get("stderr", ""),
            "execution_time_ms": result.get("execution_time_ms", 0),
        })

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

    from app.submissions.service import grade_interactive
    score, passed = grade_interactive(config, exercise.exercise_type.value, interactive_answers)

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
    exercise = await _get_exercise_with_relations(db, exercise_id)
    if exercise.exercise_type != ExerciseType.file_upload:
        raise BadRequestError("This exercise does not accept file uploads")

    config = exercise.config or {}
    now = datetime.now(timezone.utc)

    # Validate
    original = file.filename or "unknown"
    ext = os.path.splitext(original)[1].lower()
    allowed_types = config.get("allowed_types", [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"])
    if ext not in allowed_types:
        raise BadRequestError(f"File type {ext} not allowed. Allowed: {', '.join(allowed_types)}")

    max_mb = config.get("max_file_mb", settings.max_upload_mb)
    file_data = await file.read()
    size = len(file_data)
    if size > max_mb * 1024 * 1024:
        raise BadRequestError(f"File too large. Maximum {max_mb} MB.")

    mime = file.content_type or "application/octet-stream"

    # Save
    stored_name = f"{uuid.uuid4().hex}_{original}"
    upload_dir = Path(settings.upload_dir) / str(exercise.org_id) / str(exercise_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / stored_name

    with open(file_path, "wb") as f:
        f.write(file_data)

    submission = ExerciseSubmission(
        exercise_id=exercise_id,
        student_id=user.id,
        status="submitted",
        original_filename=original,
        stored_filename=stored_name,
        file_path=str(file_path),
        file_size=size,
        mime_type=mime,
        submitted_at=now,
    )
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

    count_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        base.order_by(ExerciseSubmission.submitted_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = list(result.scalars().all())

    return items, total


# ─── Game Level Submission ────────────────────────────────────────────

GAME_XP = {
    ExerciseType.robot_2d: 30,
    ExerciseType.math_interactive: 25,
    ExerciseType.world_3d: 40,
}


async def _submit_game_level(
    db: AsyncSession,
    exercise: Exercise,
    user: User,
    data: dict,
    now: datetime,
) -> ExerciseSubmission:
    game_result = data.get("game_result")
    if not game_result or not isinstance(game_result, dict):
        raise BadRequestError("game_result is required for game level exercises")

    completed = bool(game_result.get("completed", False))
    score_raw = game_result.get("score", 0.0)
    score = max(0.0, min(1.0, float(score_raw)))
    score_percent = score * 100

    submission = ExerciseSubmission(
        exercise_id=exercise.id,
        student_id=user.id,
        answers={
            "game_result": {
                "completed": completed,
                "score": score,
                "steps_used": game_result.get("steps_used", 0),
                "time_seconds": game_result.get("time_seconds", 0),
                "code_snapshot": game_result.get("code_snapshot"),
                "replay_log": game_result.get("replay_log"),
            }
        },
        score=score_percent,
        passed=completed,
        status="graded",
        submitted_at=now,
        graded_at=now,
    )
    db.add(submission)
    await db.flush()

    if completed:
        xp = GAME_XP.get(exercise.exercise_type, 25)
        reason = f"{exercise.exercise_type.value}_completed"
        await _award_xp(db, user.id, xp, reason)

    return await _reload_submission(db, submission.id)


# ─── Helpers ─────────────────────────────────────────────────────────

async def _reload_submission(db: AsyncSession, sid: uuid.UUID) -> ExerciseSubmission:
    result = await db.execute(
        select(ExerciseSubmission).where(ExerciseSubmission.id == sid)
    )
    return result.scalar_one()


async def _award_xp(db: AsyncSession, user_id: uuid.UUID, amount: int, reason: str) -> None:
    try:
        from app.gamification.service import award_xp
        await award_xp(db, user_id, amount, reason)
    except Exception:
        pass
