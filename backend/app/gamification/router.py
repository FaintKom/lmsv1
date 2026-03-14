from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.gamification.schemas import BadgeResponse, LeaderboardEntry, StreakResponse, LeagueInfo
from app.gamification.service import get_leaderboard, get_leagues_info, get_user_badges, get_user_streak

router = APIRouter()


@router.get("/my-badges", response_model=list[BadgeResponse])
async def my_badges_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_badges(db, user.id, user.org_id)


@router.get("/my-streak", response_model=StreakResponse)
async def my_streak_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_streak(db, user.id)


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_leaderboard(db, user.org_id)


@router.get("/leagues")
async def leagues_endpoint():
    return await get_leagues_info()
