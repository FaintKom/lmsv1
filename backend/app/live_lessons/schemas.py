"""Pydantic schemas for live lessons."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class StartLessonRequest(BaseModel):
    group_id: uuid.UUID
    course_id: uuid.UUID | None = None
    class_session_id: uuid.UUID | None = None


class SceneRequest(BaseModel):
    type: Literal["blank", "board", "material", "task", "solution"]
    payload: dict = Field(default_factory=dict)


class SettingsRequest(BaseModel):
    follow_mode: Literal["strict", "free"]


class LiveLessonResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    group_id: uuid.UUID
    course_id: uuid.UUID | None
    teacher_id: uuid.UUID | None
    class_session_id: uuid.UUID | None
    status: str
    follow_mode: str
    current_scene: dict | None
    created_at: datetime
    ended_at: datetime | None
    summary: dict | None
    model_config = {"from_attributes": True}


class LessonStateResponse(BaseModel):
    lesson: LiveLessonResponse
    my_signal: str | None = None
    active_poll: dict | None = None
    board_ids: list[uuid.UUID] = Field(default_factory=list)


class BoardCreateRequest(BaseModel):
    kind: Literal["board", "annotation"] = "board"
    material_ref: str | None = Field(default=None, max_length=255)


class BoardResponse(BaseModel):
    id: uuid.UUID
    kind: str
    scene: dict
    version: int
    material_ref: str | None
    model_config = {"from_attributes": True}


class BoardDeltaRequest(BaseModel):
    updated: list[dict] = Field(default_factory=list)
    deleted: list[str] = Field(default_factory=list)
    version: int


class HeartbeatRequest(BaseModel):
    current_view: str = Field(default="", max_length=255)
    exercise_id: uuid.UUID | None = None


class SignalRequest(BaseModel):
    type: Literal["hand", "confused", "done"]


class PollCreateRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    options: list[str] = Field(min_length=2, max_length=10)


class VoteRequest(BaseModel):
    option: int = Field(ge=0)


class MessageRequest(BaseModel):
    student_id: uuid.UUID
    text: str = Field(min_length=1, max_length=2000)


class DraftRequest(BaseModel):
    answers: dict | None = None
    source_code: str | None = Field(default=None, max_length=100_000)
