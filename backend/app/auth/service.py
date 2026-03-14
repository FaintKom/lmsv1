import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slugify import slugify

from app.auth.models import Organization, User, UserRole
from app.auth.schemas import RegisterRequest
from app.auth.security import hash_password, verify_password
from app.common.exceptions import BadRequestError, NotFoundError


async def register(db: AsyncSession, data: RegisterRequest) -> tuple[User, Organization]:
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise BadRequestError("Email already registered")

    # Create organization
    slug = slugify(data.org_name)
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while True:
        existing_org = await db.execute(
            select(Organization).where(Organization.slug == slug)
        )
        if not existing_org.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    org = Organization(name=data.org_name, slug=slug)
    db.add(org)
    await db.flush()

    # Create admin user
    user = User(
        org_id=org.id,
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.admin,
    )
    db.add(user)
    await db.flush()

    return user, org


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise BadRequestError("Invalid email or password")

    if not user.is_active:
        raise BadRequestError("Account is deactivated")

    return user


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return user
