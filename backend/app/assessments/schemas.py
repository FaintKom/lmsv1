import uuid
from datetime import datetime

from pydantic import BaseModel


class QuizQuestionInline(BaseModel):
    text: str
    options: list[str]
    correct: int  # index of correct option


class QuizCreate(BaseModel):
    lesson_id: uuid.UUID
    title: str
    passing_score: int = 70
    time_limit_minutes: int | None = None
    questions: list[QuizQuestionInline] = []


class QuestionCreate(BaseModel):
    question_text: str
    question_type: str  # multiple_choice or text_answer
    options: list[dict] | None = None  # [{id, text, is_correct}]
    correct_answer: str | None = None
    points: int = 1


class QuizUpdate(BaseModel):
    title: str | None = None
    passing_score: int | None = None
    time_limit_minutes: int | None = None


class QuestionUpdate(BaseModel):
    question_text: str | None = None
    question_type: str | None = None
    options: list[dict] | None = None
    correct_answer: str | None = None
    points: int | None = None
    sort_order: int | None = None


class QuizSubmitRequest(BaseModel):
    answers: list[dict]  # [{question_id, selected_option or text}]
    # Time-on-task (Phase 2 analytics). Optional — older clients omit it and the
    # submission still succeeds with the timing fields left NULL. Clamped
    # server-side to [0, 86400] (24h) to drop garbage / tab-switch inflation.
    elapsed_seconds: int | None = None


class QuizResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    title: str
    passing_score: int
    time_limit_minutes: int | None
    questions: list["QuestionResponse"] | None = None

    model_config = {"from_attributes": True}


class QuestionResponse(BaseModel):
    id: uuid.UUID
    question_text: str
    question_type: str
    options: list[dict] | None
    points: int
    sort_order: int

    model_config = {"from_attributes": True}


class SubmissionResponse(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    score: float | None
    passed: bool | None
    submitted_at: datetime

    model_config = {"from_attributes": True}
