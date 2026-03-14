from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.billing.models import Plan, Subscription
from app.auth.models import User
from app.common.exceptions import NotFoundError


async def list_plans(db: AsyncSession) -> list[Plan]:
    result = await db.execute(select(Plan).where(Plan.is_active == True).order_by(Plan.price_monthly))
    return list(result.scalars().all())


async def get_subscription(db: AsyncSession, user: User) -> Subscription | None:
    result = await db.execute(
        select(Subscription).where(Subscription.org_id == user.org_id)
    )
    return result.scalar_one_or_none()
