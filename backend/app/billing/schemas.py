import uuid

from pydantic import BaseModel


class PlanResponse(BaseModel):
    id: uuid.UUID
    name: str
    price_monthly: float
    max_students: int
    max_courses: int
    features: dict

    model_config = {"from_attributes": True}


class CheckoutRequest(BaseModel):
    plan_id: uuid.UUID


class CheckoutResponse(BaseModel):
    checkout_url: str


class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    status: str
    current_period_start: str
    current_period_end: str

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    amount_cents: int
    status: str
    invoice_url: str | None = None
    period_start: str
    period_end: str
    created_at: str

    model_config = {"from_attributes": True}
