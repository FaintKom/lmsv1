import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import Organization, PasswordResetToken, RefreshToken, User
from app.auth.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    UserUpdate,
)
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.auth.service import authenticate, get_user_by_id, register
from app.common.exceptions import BadRequestError
from app.common.rate_limit import limiter
from app.db.session import get_db

router = APIRouter()


async def _issue_refresh_token(
    db: AsyncSession,
    user: User,
    request: Request,
) -> str:
    """Create a refresh token, persist its jti, return the encoded JWT."""
    token, jti, expires_at = create_refresh_token({"sub": str(user.id)})
    client = request.client
    ip = client.host if client else None
    user_agent = request.headers.get("user-agent")
    db.add(
        RefreshToken(
            user_id=user.id,
            jti=jti,
            expires_at=expires_at,
            user_agent=(user_agent or "")[:500] or None,
            ip_address=(ip or "")[:64] or None,
        )
    )
    await db.flush()
    return token


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
@limiter.limit("3/hour")
async def register_endpoint(
    request: Request,
    response: Response,
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    user, org = await register(db, data)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = await _issue_refresh_token(db, user, request)

    # Send welcome email
    try:
        from app.email.service import send_welcome
        send_welcome(user.email, user.full_name)
    except Exception:
        pass  # Don't fail registration if email fails

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login_endpoint(
    request: Request,
    response: Response,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate(db, data.email, data.password)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = await _issue_refresh_token(db, user, request)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_endpoint(
    request: Request,
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise BadRequestError("Invalid refresh token")

    # The jti must exist in our tracking table and not be revoked.
    jti = payload.get("jti")
    if not jti:
        # Old-format token (pre-revocation-tracking). Reject — require re-login.
        raise BadRequestError("Refresh token missing jti; please log in again")

    stmt = select(RefreshToken).where(RefreshToken.jti == jti)
    stored = (await db.execute(stmt)).scalar_one_or_none()
    if not stored:
        raise BadRequestError("Refresh token not recognised")
    if stored.revoked_at is not None:
        raise BadRequestError("Refresh token has been revoked")
    if stored.expires_at < datetime.now(timezone.utc):
        raise BadRequestError("Refresh token has expired")

    user = await get_user_by_id(db, payload["sub"])
    if not user or not user.is_active:
        raise BadRequestError("User is not active")

    # Rotate: revoke the old token and issue a new one. A replay of the old
    # token after this point is rejected (revoked_at is set).
    stored.revoked_at = datetime.now(timezone.utc)
    db.add(stored)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = await _issue_refresh_token(db, user, request)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout_endpoint(
    data: RefreshRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke the refresh token provided in the body.

    The access token will still work until it expires (max 30 min), but the
    client can no longer refresh it into a new session. For full sign-out the
    client should also discard the access token locally.
    """
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        return {"message": "Logged out"}
    jti = payload.get("jti")
    if not jti:
        return {"message": "Logged out"}
    stmt = select(RefreshToken).where(RefreshToken.jti == jti)
    stored = (await db.execute(stmt)).scalar_one_or_none()
    if stored and stored.user_id == user.id and stored.revoked_at is None:
        stored.revoked_at = datetime.now(timezone.utc)
        db.add(stored)
        await db.flush()
    return {"message": "Logged out"}


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


@router.post("/me/password")
@limiter.limit("5/hour")
async def change_password_endpoint(
    request: Request,
    response: Response,
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change the currently-authenticated user's password.

    Requires the current password to prevent session-hijack abuse. Rate-limited
    to 5/hour to slow down credential-stuffing against stolen tokens.
    """
    if not verify_password(data.current_password, user.hashed_password):
        raise BadRequestError("Current password is incorrect")
    if len(data.new_password) < 8:
        raise BadRequestError("New password must be at least 8 characters")
    if data.new_password == data.current_password:
        raise BadRequestError("New password must differ from the current one")

    user.hashed_password = hash_password(data.new_password)
    db.add(user)
    await db.flush()
    return {"message": "Password changed successfully"}


# ─── Email Preferences ─────────────────────────────────────────────────


@router.get("/me/email-preferences")
async def get_email_preferences(user: User = Depends(get_current_user)):
    defaults = {"assignments": True, "grades": True, "deadlines": True, "courses": True}
    prefs = user.email_preferences or defaults
    return {**defaults, **prefs}


class EmailPreferencesUpdate(BaseModel):
    assignments: bool = True
    grades: bool = True
    deadlines: bool = True
    courses: bool = True


@router.put("/me/email-preferences")
async def update_email_preferences(
    data: EmailPreferencesUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.email_preferences = data.model_dump()
    db.add(user)
    await db.flush()
    return user.email_preferences


# ─── GDPR Data Export ─────────────────────────────────────────────────


@router.get("/me/data-export")
async def data_export_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export all personal data for the current user (GDPR Art. 20)."""
    from app.auth.gdpr import export_user_data

    return await export_user_data(db, user.id)


# ─── Password Reset ────────────────────────────────────────────────────


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password_endpoint(
    request: Request,
    response: Response,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a password reset token. Always returns success to avoid email enumeration."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user:
        # Invalidate any existing tokens
        existing = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used == False,  # noqa: E712
            )
        )
        for t in existing.scalars().all():
            t.used = True

        # Create new token
        token = str(uuid.uuid4())
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(reset_token)
        await db.flush()

        # Send reset email
        from app.email.service import send_password_reset
        send_password_reset(data.email, token)

    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("10/hour")
async def reset_password_endpoint(
    request: Request,
    response: Response,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid token."""
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == data.token,
            PasswordResetToken.used == False,  # noqa: E712
        )
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token:
        raise BadRequestError("Invalid or expired reset token")

    if reset_token.expires_at < datetime.now(timezone.utc):
        reset_token.used = True
        await db.flush()
        raise BadRequestError("Reset token has expired")

    if len(data.new_password) < 6:
        raise BadRequestError("Password must be at least 6 characters")

    # Update password
    result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise BadRequestError("User not found")

    user.hashed_password = hash_password(data.new_password)
    reset_token.used = True
    await db.flush()

    return {"message": "Password has been reset successfully"}
