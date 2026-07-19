import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import (
    EmailVerificationToken,
    Organization,
    PasswordResetToken,
    RefreshToken,
    User,
)
from app.auth.schemas import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    LoginRequest,
    ParentConsentConfirmRequest,
    RefreshRequest,
    RegisterRequest,
    ResendVerificationRequest,
    TokenResponse,
    UserResponse,
    UserUpdate,
    VerifyEmailRequest,
)
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.auth.service import (
    authenticate,
    confirm_parental_consent,
    get_user_by_id,
    register,
)
from app.common.exceptions import BadRequestError
from app.common.rate_limit import limiter
from app.config import settings
from app.db.session import get_db

logger = logging.getLogger(__name__)

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


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Put both tokens into httpOnly cookies (browser clients).

    JS on the page can never read these — an XSS can no longer exfiltrate
    the session. The same tokens are still returned in the JSON body for
    tests/scripts; browsers rely on the cookies only.

    CSRF note: SameSite=Lax means the browser does NOT attach these cookies
    to cross-site POST/XHR/fetch, which blocks classic CSRF. All mutating
    endpoints additionally expect JSON bodies (cross-site forms can't send
    those), so a separate CSRF-token scheme is deliberately not added.
    `secure` is off outside production so http://localhost dev works.
    """
    secure = settings.is_production()
    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=settings.jwt_access_token_expire_minutes * 60,
        path="/",
    )
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=settings.jwt_refresh_token_expire_days * 24 * 3600,
        # Only /auth/* ever needs the refresh token — keep it off every
        # other request.
        path="/api/v1/auth",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth")


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


@router.post("/register")
@limiter.limit(lambda: settings.auth_register_rate_limit)
async def register_endpoint(
    request: Request,
    response: Response,
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    user, org, org_was_created, consent_token = await register(db, data)

    # Age gate: a minor account is created consent-pending (inactive, no tokens).
    # Email the verifiable-consent link to the parent and return a pending
    # payload — the frontend shows an "awaiting parental consent" screen and the
    # student cannot log in until the parent clicks the link (account inactive).
    if consent_token is not None:
        try:
            from app.email.service import queue_email, send_parental_consent_request

            queue_email(
                send_parental_consent_request,
                consent_token.parent_email,
                user.full_name,
                consent_token.token,
            )
        except Exception:
            logger.warning("parental-consent email failed", exc_info=True)
        pending_user = UserResponse.model_validate(user)
        pending_user.parental_consent_pending = True
        return {
            "parental_consent_pending": True,
            "parent_email": consent_token.parent_email,
            "user": pending_user.model_dump(),
        }

    # Seed a demo course into the brand-new org so the admin lands on a
    # populated dashboard instead of an empty one. Best effort: failures
    # do not break registration — if no template exists or the clone
    # fails, we just log a warning and continue.
    if org_was_created:
        try:
            from app.courses.service import seed_demo_course_for_org

            seeded = await seed_demo_course_for_org(db, org.id, user.id)
            if seeded:
                logger = logging.getLogger(__name__)
                logger.info(f"Seeded demo course '{seeded.title}' into new org {org.id}")
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.warning(f"Demo course seeding failed for org {org.id}: {e}")

    # Email verification policy:
    # - Students and parents are assumed to be vouched for by the teacher who
    #   sent the invite link, so we auto-verify them (no token, no email).
    # - Staff roles (teacher, admin, super_admin) self-register, so we require
    #   email verification to prove ownership of the address.
    # The login enforcement (require_email_verification) only blocks unverified
    # users, so auto-verified students always pass regardless of the flag.
    staff_roles = {"teacher", "admin", "super_admin"}
    if user.role.value in staff_roles:
        verification_token = str(uuid.uuid4())
        db.add(
            EmailVerificationToken(
                user_id=user.id,
                token=verification_token,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            )
        )
        await db.flush()
        try:
            from app.email.service import queue_email, send_email_verification

            queue_email(
                send_email_verification,
                user.email,
                user.full_name,
                verification_token,
            )
        except Exception:
            logger.warning("email-verification send failed", exc_info=True)
    else:
        # Student / parent: joined via invite, consider email already verified.
        user.email_verified_at = datetime.now(timezone.utc)
        db.add(user)
        await db.flush()

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = await _issue_refresh_token(db, user, request)

    # Welcome email for everyone (best-effort; ignored if SMTP disabled)
    try:
        from app.email.service import queue_email, send_welcome

        queue_email(send_welcome, user.email, user.full_name)
    except Exception:
        logger.warning("welcome email failed", exc_info=True)

    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/parental-consent/confirm")
@limiter.limit("10/hour")
async def parental_consent_confirm_endpoint(
    request: Request,
    response: Response,
    data: ParentConsentConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    """Parent clicks the emailed link → record verifiable consent + activate.

    Single-hop confirmation: validates the token, sets the child's
    parental_consent_at, links the parent (ParentChild + parental_consent_by),
    and flips the child account active so they can log in. Rejects invalid,
    already-used, or expired tokens with 400.

    NOTE: this is a STARTING implementation of verifiable consent (email
    confirmation to a self-asserted parent address). It is not a legal-compliance
    guarantee — have a lawyer review the required verification strength.
    """
    child = await confirm_parental_consent(db, data.token)
    return {
        "message": "Parental consent confirmed. The student can now sign in.",
        "student_id": str(child.id),
    }


class DemoLoginRequest(BaseModel):
    role: str = "student"  # "student" or "teacher"


@router.post("/demo-login", response_model=TokenResponse)
@limiter.limit("10/hour")
async def demo_login_endpoint(
    request: Request,
    response: Response,
    data: DemoLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Issue a session for the pre-configured demo account.

    Only enabled when `settings.demo_mode_enabled` is true. Lets prospects
    try the product without creating an account. The demo accounts are
    real DB users (seeded separately) — we just authenticate into one of
    them without asking for the password. Rate-limited to 10/hour per IP
    so demo logins cannot be used to overload the server.

    When demo mode is off, returns 404 (not 403) so an attacker probing
    for the endpoint cannot tell whether it exists.
    """
    if not settings.demo_mode_enabled:
        from fastapi import HTTPException

        raise HTTPException(404, "Not found")

    target_email = (
        settings.demo_teacher_email if data.role == "teacher" else settings.demo_student_email
    )
    result = await db.execute(select(User).where(User.email == target_email))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise BadRequestError(f"Demo account {target_email} is not available. Contact support.")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = await _issue_refresh_token(db, user, request)

    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit(lambda: settings.auth_login_rate_limit)
async def login_endpoint(
    request: Request,
    response: Response,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate(db, data.email, data.password)

    # Optional email verification enforcement. Off by default so deployments
    # without SMTP keep working. Flip settings.require_email_verification to
    # true in the env once you've confirmed email delivery works.
    if settings.require_email_verification and user.email_verified_at is None:
        raise BadRequestError(
            "Email not verified. Check your inbox for the verification link or request a new one."
        )

    user.last_active_at = datetime.now(timezone.utc)
    db.add(user)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = await _issue_refresh_token(db, user, request)

    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_endpoint(
    request: Request,
    response: Response,
    data: RefreshRequest | None = None,
    refresh_token_cookie: str | None = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db),
):
    # Browser clients carry the token in the httpOnly cookie; scripts/tests
    # may still send it in the body. Body wins when both are present.
    raw_refresh = (data.refresh_token if data else None) or refresh_token_cookie
    if not raw_refresh:
        raise BadRequestError("No refresh token provided")
    payload = decode_token(raw_refresh)
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

    user.last_active_at = datetime.now(timezone.utc)
    db.add(user)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = await _issue_refresh_token(db, user, request)

    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout_endpoint(
    response: Response,
    data: RefreshRequest | None = None,
    refresh_token_cookie: str | None = Cookie(None, alias="refresh_token"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke the refresh token (body or httpOnly cookie) and clear cookies.

    The access token would still verify until it expires (max 30 min), but
    the browser no longer holds it after the cookie clear.
    """
    _clear_auth_cookies(response)
    raw_refresh = (data.refresh_token if data else None) or refresh_token_cookie
    if not raw_refresh:
        return {"message": "Logged out"}
    payload = decode_token(raw_refresh)
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


@router.post("/verify-email")
@limiter.limit("10/hour")
async def verify_email_endpoint(
    request: Request,
    response: Response,
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Mark the user's email verified using a one-time token from the email."""
    stmt = select(EmailVerificationToken).where(
        EmailVerificationToken.token == data.token,
        EmailVerificationToken.used == False,  # noqa: E712
    )
    token_row = (await db.execute(stmt)).scalar_one_or_none()
    if not token_row:
        raise BadRequestError("Invalid or already used verification token")
    if token_row.expires_at < datetime.now(timezone.utc):
        token_row.used = True
        await db.flush()
        raise BadRequestError("Verification token has expired; request a new one")

    user = await get_user_by_id(db, token_row.user_id)
    if not user:
        raise BadRequestError("User not found")

    user.email_verified_at = datetime.now(timezone.utc)
    token_row.used = True
    db.add(user)
    db.add(token_row)
    await db.flush()
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
@limiter.limit("3/hour")
async def resend_verification_endpoint(
    request: Request,
    response: Response,
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Issue a new verification token and email it. Always returns success to
    prevent email enumeration — the caller cannot tell whether the email
    actually exists in our system."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user and user.email_verified_at is None:
        # Invalidate any outstanding tokens
        existing = await db.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id,
                EmailVerificationToken.used == False,  # noqa: E712
            )
        )
        for t in existing.scalars().all():
            t.used = True

        token = str(uuid.uuid4())
        db.add(
            EmailVerificationToken(
                user_id=user.id,
                token=token,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            )
        )
        await db.flush()

        try:
            from app.email.service import queue_email, send_email_verification

            queue_email(send_email_verification, user.email, user.full_name, token)
        except Exception:
            logger.warning("verification-resend email failed", exc_info=True)

    return {"message": "If the email exists and is unverified, a new link has been sent."}


@router.get("/me")
async def me_endpoint(user: User = Depends(get_current_user)):
    """Return the authenticated user plus their org's branding settings.

    The org_branding dict is used by the frontend to customise the
    sidebar logo/name and inject the org's primary colour into the
    CSS custom properties (P2-2 white-label).
    """
    user_data = UserResponse.model_validate(user).model_dump()
    org_settings = {}
    if hasattr(user, "organization") and user.organization:
        org_settings = user.organization.settings or {}
    user_data["org_branding"] = {
        "logo_url": org_settings.get("logo_url"),
        "primary_color": org_settings.get("primary_color"),
        "secondary_color": org_settings.get("secondary_color"),
        "display_name": org_settings.get("display_name")
        or (
            user.organization.name
            if hasattr(user, "organization") and user.organization
            else "GrassLMS"
        ),
    }
    return user_data


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


@router.delete("/me")
@limiter.limit("3/hour")
async def delete_me_endpoint(
    request: Request,
    response: Response,
    data: DeleteAccountRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """GDPR Art. 17 — irreversibly erase the caller's own account and all data.

    Password re-auth required so a leaked access token can't wipe an account.
    Reuses the same cascade-delete path as the admin hard-delete so the two
    can never diverge. Rate-limited to slow brute-force against stolen tokens.
    """
    from app.auth.erasure import erase_user

    if not verify_password(data.password, user.hashed_password):
        raise BadRequestError("Password is incorrect")
    return await erase_user(db, user)


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
@limiter.limit(lambda: settings.auth_password_reset_rate_limit)
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

        # Send reset email off the request thread
        from app.email.service import queue_email, send_password_reset

        queue_email(send_password_reset, data.email, token)

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
