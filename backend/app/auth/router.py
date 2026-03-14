from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import Organization, User
from app.auth.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    UserUpdate,
)
from app.auth.security import create_access_token, create_refresh_token, decode_token
from app.auth.service import authenticate, get_user_by_id, register
from app.common.exceptions import BadRequestError
from app.db.session import get_db

router = APIRouter()


@router.get("/organizations")
async def search_organizations(
    q: str = Query("", min_length=0),
    db: AsyncSession = Depends(get_db),
):
    """Search organizations by name — public endpoint for registration."""
    query = select(Organization).where(Organization.is_active == True)  # noqa: E712
    if q:
        query = query.where(Organization.name.ilike(f"%{q}%"))
    query = query.order_by(Organization.name).limit(20)
    result = await db.execute(query)
    orgs = result.scalars().all()
    return [{"id": str(o.id), "name": o.name, "slug": o.slug} for o in orgs]


@router.post("/register", response_model=TokenResponse)
async def register_endpoint(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user, org = await register(db, data)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login_endpoint(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate(db, data.email, data.password)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_endpoint(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise BadRequestError("Invalid refresh token")

    user = await get_user_by_id(db, payload["sub"])
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me_endpoint(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)


@router.put("/me", response_model=UserResponse)
async def update_me_endpoint(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    if data.bio is not None:
        user.bio = data.bio

    db.add(user)
    await db.flush()
    return UserResponse.model_validate(user)


@router.put("/me/profile", response_model=UserResponse)
async def update_profile_endpoint(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url
    if data.bio is not None:
        user.bio = data.bio

    db.add(user)
    await db.flush()
    return UserResponse.model_validate(user)
