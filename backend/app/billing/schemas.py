import uuid
from datetime import datetime

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


# The five fields below were declared as `str` while the columns behind them
# are DateTime. Pydantic refuses to coerce a datetime into a str, so both
# endpoints raised as soon as their table held a row: /billing/subscription
# 500ed once a school had a subscription, /billing/invoices once it had an
# invoice. Neither could have worked in production, and the tests never saw
# it because they only ever ran against empty tables.


class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    status: str
    current_period_start: datetime
    current_period_end: datetime

    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    amount_cents: int
    status: str
    invoice_url: str | None = None
    period_start: datetime
    period_end: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
