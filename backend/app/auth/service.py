import uuid
from datetime import datetime, timezone

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Organization, User, UserRole
from app.auth.schemas import RegisterRequest
from app.auth.security import hash_password, verify_password
from app.common.exceptions import BadRequestError, NotFoundError


async def register(
    db: AsyncSession, data: RegisterRequest
) -> tuple[User, Organization, bool]:
    """Register a new user.

    Returns (user, organization, org_was_created). The third element is True
    when this call also created a brand-new Organization row (i.e. a teacher
    self-registering a new school), and False when the user is joining an
    existing org via an invite link.
    """
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise BadRequestError("Email already registered")

    # Determine role
    if data.role == "student":
        user_role = UserRole.student
    else:
        user_role = UserRole.teacher

    # Students can only register via invite link (must have org_id)
    if data.role == "student" and not data.org_id:
        raise BadRequestError("Student accounts can only be created via invitation link")

    # Students join existing org, teachers create a new one
    org_was_created = False
    if data.org_id and data.role == "student":
        # Join existing organization
        result = await db.execute(
            select(Organization).where(Organization.id == uuid.UUID(data.org_id))
        )
        org = result.scalar_one_or_none()
        if not org:
            raise BadRequestError("Organization not found")
    else:
        # Create new organization
        if not data.org_name:
            raise BadRequestError("Organization name is required")
        slug = slugify(data.org_name)
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
        org_was_created = True

    if not data.consent_accepted:
        raise BadRequestError("You must accept the Privacy Policy and Terms of Service")

    # A teacher who self-registers a brand-new organization is the
    # founding user of that org, so promote them to admin. Without this,
    # a fresh school has no one who can manage members or billing.
    if org_was_created and user_role == UserRole.teacher:
        user_role = UserRole.admin

    user = User(
        org_id=org.id,
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=user_role,
        consent_accepted_at=datetime.now(tz=timezone.utc),
        privacy_policy_version="1.0",
    )
    db.add(user)
    await db.flush()

    return user, org, org_was_created


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
