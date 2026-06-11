import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.assessments.grading import build_submission_breakdown, grade_quiz
from app.assessments.models import Question, Quiz, QuizSubmission
from app.auth.models import User, UserRole
from app.common.auth import lesson_in_user_org
from app.common.exceptions import ForbiddenError, NotFoundError
from app.common.timing import normalize_elapsed
from app.courses.models import Course, Lesson, Module


async def create_quiz(db: AsyncSession, data: dict) -> Quiz:
    questions_data = data.pop("questions", [])
    quiz = Quiz(**data)
    db.add(quiz)
    await db.flush()

    for i, q in enumerate(questions_data):
        options = [{"id": j, "text": opt, "is_correct": j == q["correct"]} for j, opt in enumerate(q["options"])]
        question = Question(
            quiz_id=quiz.id,
            question_text=q["text"],
            question_type="multiple_choice",
            options=options,
            correct_answer=str(q["correct"]),
            sort_order=i,
        )
        db.add(question)

    await db.flush()
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz.id).options(selectinload(Quiz.questions))
    )
    return result.scalar_one()


async def get_quiz(db: AsyncSession, quiz_id: uuid.UUID, user: User) -> Quiz:
    result = await db.execute(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions))
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise NotFoundError("Quiz not found")
    # Enforce tenant boundary: the quiz's lesson must belong to the caller's org.
    await lesson_in_user_org(db, quiz.lesson_id, user)
    return quiz


async def get_quiz_by_lesson(db: AsyncSession, lesson_id: uuid.UUID, user: User) -> Quiz:
    await lesson_in_user_org(db, lesson_id, user)
    result = await db.execute(
        select(Quiz)
        .where(Quiz.lesson_id == lesson_id)
        .options(selectinload(Quiz.questions))
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise NotFoundError("Quiz not found for this lesson")
    return quiz


async def update_quiz(db: AsyncSession, quiz_id: uuid.UUID, data: dict) -> Quiz:
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id).options(selectinload(Quiz.questions))
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise NotFoundError("Quiz not found")
    for key, value in data.items():
        if value is not None:
            setattr(quiz, key, value)
    await db.flush()
    return quiz


async def add_question(db: AsyncSession, quiz_id: uuid.UUID, data: dict) -> Question:
    max_order = (
        await db.execute(
            select(func.coalesce(func.max(Question.sort_order), -1)).where(
                Question.quiz_id == quiz_id
            )
        )
    ).scalar() or 0

    question = Question(quiz_id=quiz_id, sort_order=max_order + 1, **data)
    db.add(question)
    await db.flush()
    return question


async def update_question(db: AsyncSession, question_id: uuid.UUID, data: dict) -> Question:
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise NotFoundError("Question not found")
    for key, value in data.items():
        if value is not None:
            setattr(question, key, value)
    await db.flush()
    return question


async def delete_question(db: AsyncSession, question_id: uuid.UUID) -> None:
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise NotFoundError("Question not found")
    await db.delete(question)
    await db.commit()


async def submit_quiz(
    db: AsyncSession,
    quiz_id: uuid.UUID,
    answers: list[dict],
    user: User,
    elapsed_seconds: int | None = None,
) -> QuizSubmission:
    quiz = await get_quiz(db, quiz_id, user)

    score_percent, total_points = grade_quiz(quiz.questions, answers)
    passed = score_percent >= quiz.passing_score

    now = datetime.now(timezone.utc)

    # Stored attempt number = prior submission count + 1 (Phase 2 analytics).
    prior_count = (
        await db.execute(
            select(func.count()).where(
                QuizSubmission.quiz_id == quiz_id,
                QuizSubmission.student_id == user.id,
            )
        )
    ).scalar() or 0

    submission = QuizSubmission(
        quiz_id=quiz_id,
        student_id=user.id,
        answers=answers,
        score=score_percent,
        passed=passed,
        submitted_at=now,
        graded_at=now,
        attempt_number=prior_count + 1,
    )
    # Time-on-task: clamp to [0, 24h]; leave NULL when the client omits it.
    elapsed = normalize_elapsed(elapsed_seconds)
    if elapsed is not None:
        submission.time_spent_seconds = elapsed
        submission.started_at = now - timedelta(seconds=elapsed)
    db.add(submission)
    await db.flush()

    # Award XP for passing quiz
    if passed:
        try:
            from app.gamification.service import XP_QUIZ_PASSED, award_xp
            await award_xp(db, user.id, XP_QUIZ_PASSED, "quiz_passed")
        except Exception:
            pass

    return submission


def _can_review_course(user: User, course: Course) -> bool:
    """Whether a staff user may review submissions in this course.

    Mirrors the task-stats RBAC: super_admin → any org; admin/methodist →
    own org; plain teacher → only courses they own. Students/parents never.
    """
    if user.role == UserRole.super_admin:
        return True
    if user.role in (UserRole.student, UserRole.parent):
        return False
    if course.org_id != user.org_id:
        return False
    org_wide = user.role == UserRole.admin or bool(user.is_methodist)
    if org_wide:
        return True
    # Plain teacher: only their own course.
    return user.role == UserRole.teacher and course.teacher_id == user.id


async def get_latest_submission_breakdown(
    db: AsyncSession, quiz_id: uuid.UUID, student_id: uuid.UUID, user: User
) -> dict:
    """Breakdown of a student's most-recent submission for a quiz.

    Convenience entry point for the gradebook, which knows (quiz, student)
    but not a specific submission id. Delegates RBAC to
    :func:`get_submission_breakdown`.
    """
    result = await db.execute(
        select(QuizSubmission.id)
        .where(
            QuizSubmission.quiz_id == quiz_id,
            QuizSubmission.student_id == student_id,
        )
        .order_by(QuizSubmission.submitted_at.desc())
        .limit(1)
    )
    submission_id = result.scalar_one_or_none()
    if not submission_id:
        raise NotFoundError("Submission not found")
    return await get_submission_breakdown(db, submission_id, user)


async def get_submission_breakdown(
    db: AsyncSession, submission_id: uuid.UUID, user: User
) -> dict:
    """Teacher-facing per-question breakdown of a single quiz submission.

    RBAC: only staff who own/oversee the course (see :func:`_can_review_course`).
    Org isolation: cross-org access is hidden as 404. Students/parents → 403.
    """
    # Students and parents may never review submissions via this endpoint.
    if user.role in (UserRole.student, UserRole.parent):
        raise ForbiddenError("You cannot review quiz submissions")

    result = await db.execute(
        select(QuizSubmission).where(QuizSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise NotFoundError("Submission not found")

    # Load quiz + questions.
    quiz = await get_quiz(db, submission.quiz_id, user)

    # Resolve the owning course (quiz → lesson → module → course) for RBAC.
    course = (
        await db.execute(
            select(Course)
            .join(Module, Module.course_id == Course.id)
            .join(Lesson, Lesson.module_id == Module.id)
            .where(Lesson.id == quiz.lesson_id)
        )
    ).scalar_one_or_none()
    if not course:
        raise NotFoundError("Submission not found")

    if not _can_review_course(user, course):
        # Hide existence across orgs; surface a clear 403 for same-org denials.
        if course.org_id != user.org_id and user.role != UserRole.super_admin:
            raise NotFoundError("Submission not found")
        raise ForbiddenError("You can only review your own courses")

    answers = submission.answers or []
    breakdown = build_submission_breakdown(quiz.questions, answers)
    total_points = sum(q.points for q in quiz.questions)
    earned_points = sum(item["points_earned"] for item in breakdown)

    student = (
        await db.execute(select(User).where(User.id == submission.student_id))
    ).scalar_one_or_none()

    return {
        "submission_id": submission.id,
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "passing_score": quiz.passing_score,
        "student_id": submission.student_id,
        "student_name": student.full_name if student else None,
        "student_email": student.email if student else None,
        "score": float(submission.score) if submission.score is not None else None,
        "passed": submission.passed,
        "submitted_at": submission.submitted_at,
        "total_points": total_points,
        "earned_points": earned_points,
        "questions": breakdown,
    }
