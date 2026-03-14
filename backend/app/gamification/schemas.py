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


class LeagueInfo(BaseModel):
    name: str
    icon: str
    min_xp: int
    color: str
    next_league: str | None = None
    next_xp: int | None = None
    progress: float = 0.0


class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    last_activity_date: str | None
    total_xp: int = 0
    league: LeagueInfo | None = None


class LeaderboardEntry(BaseModel):
    user_id: uuid.UUID
    user_name: str
    completed_lessons: int
    current_streak: int
    badge_count: int
    total_xp: int = 0
    league: LeagueInfo | None = None
