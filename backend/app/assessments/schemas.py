import uuid

from pydantic import BaseModel


class QuizCreate(BaseModel):
    lesson_id: uuid.UUID
    title: str
    passing_score: int = 70
    time_limit_minutes: int | None = None


class QuestionCreate(BaseModel):
    question_text: str
    question_type: str  # multiple_choice or text_answer
    options: list[dict] | None = None  # [{id, text, is_correct}]
    correct_answer: str | None = None
    points: int = 1


class QuizSubmitRequest(BaseModel):
    answers: list[dict]  # [{question_id, selected_option or text}]


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
    submitted_at: str

    model_config = {"from_attributes": True}
