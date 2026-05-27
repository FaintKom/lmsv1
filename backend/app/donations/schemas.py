"""Donation request/response schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.donations.models import DonationStatus, Recurrence


class DonationInitiateRequest(BaseModel):
    amount_cents: int = Field(ge=100, le=1_000_000, description="USD cents. Min 100 ($1), max 1_000_000 ($10k).")
    recurrence: Recurrence = Recurrence.one_time
    donor_name: str | None = Field(default=None, max_length=120)
    donor_email: EmailStr | None = None
    message: str | None = Field(default=None, max_length=2000)
    anonymous: bool = False


class DonationInitiateResponse(BaseModel):
    donation_id: UUID
    oc_checkout_url: str


class DonationStatusResponse(BaseModel):
    id: UUID
    status: DonationStatus
    amount_cents: int
    currency: str
    recurrence: Recurrence
    donor_name: str | None
    anonymous: bool
    confirmed_at: datetime | None

    model_config = {"from_attributes": True}


class DonationStatsResponse(BaseModel):
    total_confirmed_usd: float
    donor_count: int
