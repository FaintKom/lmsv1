from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.recommendations.service import get_recommendations

router = APIRouter()


@router.get("")
async def recommendations_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_recommendations(db, user)
