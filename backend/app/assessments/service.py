import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.assessments.grading import grade_quiz
from app.assessments.models import Question, Quiz, QuizSubmission
from app.auth.models import User
from app.common.exceptions import NotFoundError


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


async def get_quiz(db: AsyncSession, quiz_id: uuid.UUID) -> Quiz:
    result = await db.execute(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions))
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise NotFoundError("Quiz not found")
    return quiz


async def get_quiz_by_lesson(db: AsyncSession, lesson_id: uuid.UUID) -> Quiz:
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
    db: AsyncSession, quiz_id: uuid.UUID, answers: list[dict], user: User
) -> QuizSubmission:
    quiz = await get_quiz(db, quiz_id)

    score_percent, total_points = grade_quiz(quiz.questions, answers)
    passed = score_percent >= quiz.passing_score

    submission = QuizSubmission(
        quiz_id=quiz_id,
        student_id=user.id,
        answers=answers,
        score=score_percent,
        passed=passed,
        submitted_at=datetime.now(timezone.utc),
        graded_at=datetime.now(timezone.utc),
    )
    db.add(submission)
    await db.flush()

    # Award XP for passing quiz
    if passed:
        try:
            from app.gamification.service import award_xp, XP_QUIZ_PASSED
            await award_xp(db, user.id, XP_QUIZ_PASSED, "quiz_passed")
        except Exception:
            pass

    return submission
