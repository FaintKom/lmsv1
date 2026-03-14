from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.billing.schemas import PlanResponse, SubscriptionResponse
from app.billing.service import get_subscription, list_plans
from app.db.session import get_db

router = APIRouter()


@router.get("/plans", response_model=list[PlanResponse])
async def list_plans_endpoint(db: AsyncSession = Depends(get_db)):
    plans = await list_plans(db)
    return [PlanResponse.model_validate(p) for p in plans]


@router.get("/subscription", response_model=SubscriptionResponse | None)
async def get_subscription_endpoint(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    sub = await get_subscription(db, user)
    if sub:
        return SubscriptionResponse.model_validate(sub)
    return None


@router.post("/webhook")
async def stripe_webhook(request: Request):
    return {"status": "ok"}
