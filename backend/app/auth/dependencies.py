import uuid

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.auth.security import decode_token
from app.auth.service import get_user_by_id
from app.db.session import get_db

# auto_error=False: a missing Authorization header is not fatal — the token
# may arrive in the httpOnly `access_token` cookie instead (browser clients
# since 2026-07-19). Header wins when both are present (tests, scripts).
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    access_token: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials else access_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = await get_user_by_id(db, uuid.UUID(user_id))

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated",
        )

    return user


def require_role(*roles: UserRole):
    """Check that the user has one of the required roles.
    super_admin always passes.  Each endpoint must explicitly list allowed roles."""

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role == UserRole.super_admin:
            return user
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return role_checker
