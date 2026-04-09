"""AI Tutor request/response schemas."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class TutorContext(str, Enum):
    lesson = "lesson"
    exercise = "exercise"
    sat = "sat"
    general = "general"


class AiChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    context_type: TutorContext = TutorContext.general
    lesson_id: Optional[str] = None
    exercise_id: Optional[str] = None
    lesson_title: Optional[str] = None
    exercise_title: Optional[str] = None
    language: str = Field(default="en", pattern="^(en|es|ru|tr)$")
    history: list[dict] = Field(default_factory=list, max_length=10)


class AiChatResponse(BaseModel):
    response: str
    tokens_used: int = 0
