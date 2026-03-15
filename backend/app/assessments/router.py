import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.assessments.schemas import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuizCreate,
    QuizUpdate,
    QuizResponse,
    QuizSubmitRequest,
    SubmissionResponse,
)
from app.assessments.service import (
    add_question, create_quiz, update_quiz, get_quiz,
    get_quiz_by_lesson, submit_quiz, update_question, delete_question,
)
from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db

router = APIRouter()


def _strip_answers_for_student(quiz_data: dict, user: User) -> dict:
    """Remove correct answers from quiz data for students."""
    if user.role in (UserRole.admin, UserRole.teacher, UserRole.super_admin):
        return quiz_data
    if quiz_data.get("questions"):
        for q in quiz_data["questions"]:
            if q.get("options"):
                for opt in q["options"]:
                    opt.pop("is_correct", None)
            q.pop("correct_answer", None)
    return quiz_data


@router.post("/quizzes", response_model=QuizResponse)
async def create_quiz_endpoint(
    data: QuizCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    quiz = await create_quiz(db, data.model_dump())
    return QuizResponse.model_validate(quiz)


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
async def get_quiz_endpoint(
    quiz_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quiz = await get_quiz(db, quiz_id)
    data = QuizResponse.model_validate(quiz).model_dump()
    return _strip_answers_for_student(data, user)


@router.get("/lessons/{lesson_id}/quiz", response_model=QuizResponse)
async def get_quiz_by_lesson_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    quiz = await get_quiz_by_lesson(db, lesson_id)
    data = QuizResponse.model_validate(quiz).model_dump()
    return _strip_answers_for_student(data, user)


@router.post("/quizzes/{quiz_id}/questions", response_model=QuestionResponse)
async def add_question_endpoint(
    quiz_id: uuid.UUID,
    data: QuestionCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    question = await add_question(db, quiz_id, data.model_dump())
    return QuestionResponse.model_validate(question)


@router.put("/quizzes/{quiz_id}", response_model=QuizResponse)
async def update_quiz_endpoint(
    quiz_id: uuid.UUID,
    data: QuizUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    quiz = await update_quiz(db, quiz_id, data.model_dump(exclude_unset=True))
    return QuizResponse.model_validate(quiz)


@router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question_endpoint(
    question_id: uuid.UUID,
    data: QuestionUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    question = await update_question(db, question_id, data.model_dump(exclude_unset=True))
    return QuestionResponse.model_validate(question)


@router.delete("/questions/{question_id}")
async def delete_question_endpoint(
    question_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_question(db, question_id)
    return {"status": "ok"}


@router.delete("/quizzes/{quiz_id}")
async def delete_quiz_endpoint(
    quiz_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.assessments.models import Quiz
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise __import__("app.common.exceptions", fromlist=["NotFoundError"]).NotFoundError("Quiz not found")
    await db.delete(quiz)
    await db.flush()
    return {"status": "ok"}


@router.post("/quizzes/{quiz_id}/submit", response_model=SubmissionResponse)
async def submit_quiz_endpoint(
    quiz_id: uuid.UUID,
    data: QuizSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    submission = await submit_quiz(db, quiz_id, data.answers, user)
    return SubmissionResponse.model_validate(submission)
