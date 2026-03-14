import uuid
from datetime import datetime

from pydantic import BaseModel


class BadgeResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    icon: str
    criteria_key: str
    earned: bool = False
    earned_at: datetime | None = None

    model_config = {"from_attributes": True}


class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    last_activity_date: str | None


class LeaderboardEntry(BaseModel):
    user_id: uuid.UUID
    user_name: str
    completed_lessons: int
    current_streak: int
    badge_count: int
