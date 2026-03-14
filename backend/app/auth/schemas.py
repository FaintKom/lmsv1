import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    org_name: str = ""  # For teachers creating a new org
    org_id: str | None = None  # For students joining an existing org
    full_name: str
    email: EmailStr
    password: str
    role: str = "teacher"  # "teacher" or "student"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    org_id: uuid.UUID
    avatar_url: str | None = None
    bio: str | None = None
    is_active: bool = True
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "student"
    full_name: str = ""
