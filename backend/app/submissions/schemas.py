import uuid
from datetime import datetime

from pydantic import BaseModel


class FileSubmissionResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    student_id: uuid.UUID
    original_filename: str
    file_size: int
    mime_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InteractiveSubmitRequest(BaseModel):
    exercise_type: str
    answers: dict


class InteractiveSubmissionResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    exercise_type: str
    score: float | None
    passed: bool | None
    created_at: datetime

    model_config = {"from_attributes": True}
