import uuid
from datetime import datetime

from pydantic import BaseModel, Field


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


# ── Room (My Room feature) ──────────────────────────────────────────────


class RoomItemResponse(BaseModel):
    id: str
    slot: str
    group_name: str = Field(alias="group_name")
    name: str
    i18n_key: str
    price: int
    is_default: bool
    swatch: str | None = None
    color_hex: str | None = None
    floor_type: str | None = None
    item_type: str = "room"

    model_config = {"from_attributes": True}


class RoomEquipOffset(BaseModel):
    item_id: str | None = None
    offset_dx: int = 0
    offset_dy: int = 0
    offset_dz: int = 0
    offset_rot: int = 0


class PlacedItemResponse(BaseModel):
    id: uuid.UUID
    item_id: str
    x: float
    y: float
    z: float
    rot: float
    scale: float

    model_config = {"from_attributes": True}


class RoomStateResponse(BaseModel):
    wallet: int  # total_xp (acts as wallet — never decremented)
    equipped: dict[str, RoomEquipOffset]  # slot -> {item_id, offset_dx, offset_dz, offset_rot}
    catalog: list[RoomItemResponse]
    # Freeform furniture/decor instances (any count, anywhere). Avatar parts +
    # wall/floor stay in `equipped`.
    placed: list[PlacedItemResponse] = []


class PlacedCreateRequest(BaseModel):
    item_id: str = Field(min_length=1, max_length=60)
    x: float = 7.0
    y: float = 0.0
    z: float = 7.0
    rot: float = 0.0
    scale: float = 1.0


class PlacedUpdateRequest(BaseModel):
    x: float
    y: float
    z: float
    rot: float
    scale: float = 1.0


class RoomEquipRequest(BaseModel):
    slot: str = Field(min_length=1, max_length=40)
    item_id: str | None = Field(default=None, max_length=60)


class RoomLayoutRequest(BaseModel):
    slot: str = Field(min_length=1, max_length=40)
    offset_dx: int = Field(ge=-12, le=12)
    offset_dy: int = Field(default=0, ge=-24, le=24)
    offset_dz: int = Field(ge=-12, le=12)
    # Rotation in degrees; server normalizes mod 360.
    offset_rot: int = 0
