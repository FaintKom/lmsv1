import uuid
from datetime import datetime

from pydantic import BaseModel


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    event_type: str = "custom"
    start_time: datetime
    end_time: datetime | None = None
    all_day: bool = False
    course_id: uuid.UUID | None = None
    group_id: uuid.UUID | None = None
    recurrence: str | None = None


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    event_type: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    all_day: bool | None = None
    course_id: uuid.UUID | None = None
    group_id: uuid.UUID | None = None
    recurrence: str | None = None


class EventResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    event_type: str
    start_time: datetime
    end_time: datetime | None
    all_day: bool
    course_id: uuid.UUID | None
    group_id: uuid.UUID | None
    created_by: uuid.UUID
    recurrence: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
