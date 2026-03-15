import uuid
from datetime import datetime

from pydantic import BaseModel


class MeetingCreate(BaseModel):
    title: str
    description: str | None = None
    course_id: uuid.UUID | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int = 60


class MeetingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None


class MeetingResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    room_url: str
    course_id: uuid.UUID | None
    created_by: uuid.UUID
    scheduled_at: datetime | None
    duration_minutes: int
    is_active: bool
    ended_at: datetime | None
    recording_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
