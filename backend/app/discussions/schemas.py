import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)
    parent_id: uuid.UUID | None = None


class CommentResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    user_avatar: str | None
    body: str
    parent_id: uuid.UUID | None
    replies: list["CommentResponse"] = []
    created_at: datetime

    model_config = {"from_attributes": True}
