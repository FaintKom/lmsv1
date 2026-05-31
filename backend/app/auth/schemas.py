import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.common.profanity import contains_profanity


class RegisterRequest(BaseModel):
    org_name: str = ""  # For teachers creating a new org
    org_id: str | None = None  # For students joining an existing org
    full_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str
    role: str = "teacher"  # "teacher" or "student"
    consent_accepted: bool = False
    # Child safety: for a student account the invite-holder attests that
    # verifiable parental consent was obtained offline (school-mediated model).
    # Still accepted (backward-compatible). When date_of_birth shows the student
    # is below settings.digital_consent_age, this self-attestation is NOT enough
    # — the account is created consent-pending and a verifiable-consent email is
    # sent to parent_email instead.
    parental_consent_accepted: bool = False
    # Age gate. Optional & backward-compatible: omitting it preserves the legacy
    # self-attestation path (the user is treated as adult/unknown age).
    date_of_birth: date | None = None
    # Required only when the DOB makes the student a minor; the verifiable
    # consent request is emailed here.
    parent_email: EmailStr | None = None

    @field_validator("full_name")
    @classmethod
    def _full_name_no_profanity(cls, v: str) -> str:
        if contains_profanity(v):
            raise ValueError("Name contains inappropriate language")
        return v


class ParentConsentConfirmRequest(BaseModel):
    """Body for POST /auth/parental-consent/confirm — token from the email."""

    token: str


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
    is_methodist: bool = False
    created_at: datetime | None = None
    consent_accepted_at: datetime | None = None
    email_verified_at: datetime | None = None
    # True when this is a minor account still awaiting verifiable parental
    # consent: the account exists but is inactive until the parent clicks the
    # emailed link. The frontend uses this to show an "awaiting consent" screen
    # instead of a normal session. Computed in the router (not a column).
    parental_consent_pending: bool = False

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=100)
    avatar_url: str | None = None
    bio: str | None = Field(None, max_length=280)

    @field_validator("full_name", "bio")
    @classmethod
    def _no_profanity(cls, v: str | None) -> str | None:
        if v and contains_profanity(v):
            raise ValueError("Text contains inappropriate language")
        return v


class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "student"
    full_name: str = ""


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    # GDPR Art. 17: self-service erasure. Password re-auth guards against a
    # stolen access token irreversibly wiping the account.
    password: str


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr
