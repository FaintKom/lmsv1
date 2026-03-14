import uuid
from datetime import datetime

from pydantic import BaseModel


class EnrollRequest(BaseModel):
    course_id: uuid.UUID


class EnrollmentResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    student_id: uuid.UUID
    progress_percent: float
    enrolled_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class LessonProgressResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    status: str
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}
