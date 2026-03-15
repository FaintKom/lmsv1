import uuid
from datetime import datetime

from pydantic import BaseModel


class AssignmentCreate(BaseModel):
    course_id: uuid.UUID
    group_id: uuid.UUID | None = None
    title: str
    description: str = ""
    due_date: datetime
    max_score: int = 100
    allow_late: bool = False


class AssignmentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: datetime | None = None
    max_score: int | None = None
    allow_late: bool | None = None
    group_id: uuid.UUID | None = None


class AssignmentResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    group_id: uuid.UUID | None
    created_by: uuid.UUID
    title: str
    description: str
    due_date: datetime
    max_score: int
    allow_late: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None
    submission_count: int = 0
    course_title: str | None = None

    model_config = {"from_attributes": True}


class AssignmentListItem(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    due_date: datetime
    max_score: int
    allow_late: bool
    created_at: datetime | None = None
    course_title: str | None = None
    status: str | None = None
    score: float | None = None

    model_config = {"from_attributes": True}


class SubmissionResponse(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    student_id: uuid.UUID
    student_name: str | None = None
    content: str | None
    file_path: str | None
    original_filename: str | None
    submitted_at: datetime
    score: float | None
    feedback: str | None
    graded_by: uuid.UUID | None
    graded_at: datetime | None
    status: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class GradeRequest(BaseModel):
    score: float
    feedback: str = ""
