import uuid
from datetime import datetime, timedelta, timezone

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import (
    Organization,
    ParentConsentToken,
    User,
    UserRole,
    compute_age,
)
from app.auth.schemas import RegisterRequest
from app.auth.security import hash_password, verify_password
from app.common.exceptions import BadRequestError, NotFoundError
from app.config import settings


async def register(
    db: AsyncSession, data: RegisterRequest
) -> tuple[User, Organization, bool, ParentConsentToken | None]:
    """Register a new user.

    Returns (user, organization, org_was_created, consent_token).

    - org_was_created is True when this call also created a brand-new
      Organization row (a teacher self-registering a new school), False when the
      user joined an existing org via an invite link.
    - consent_token is a non-None ParentConsentToken ONLY when the registrant is
      a student whose self-reported date of birth puts them below
      settings.digital_consent_age. In that case the account is created
      *consent-pending* (is_active=False, parental_consent_at left NULL) and the
      caller must email the token's link to the parent. For everyone else it is
      None and registration behaves exactly as before (backward-compatible).
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

    # ── Age gate + verifiable parental consent (GDPR Art. 8) ──────────────
    # Compute the self-reported age. None means no DOB was supplied (legacy
    # path / existing behaviour) — treated as adult/unknown so nobody is locked
    # out. A student below settings.digital_consent_age is a "minor" and cannot
    # self-consent: we create the account consent-pending and issue a token to
    # email to their parent/guardian.
    age = compute_age(data.date_of_birth)
    is_minor_student = (
        user_role == UserRole.student
        and age is not None
        and age < settings.digital_consent_age
    )

    # Child safety: a student account may only be created once consent exists.
    # For an adult/unknown-age student the self-attestation checkbox path stays
    # in force (school-mediated / self-service). For a minor we IGNORE the
    # checkbox and require a parent_email for the verifiable flow instead.
    parental_consent_at = None
    if user_role == UserRole.student and not is_minor_student:
        if not data.parental_consent_accepted:
            raise BadRequestError(
                "A parent or guardian must confirm consent before a student account can be created"
            )
        parental_consent_at = datetime.now(tz=timezone.utc)
    if is_minor_student and not data.parent_email:
        raise BadRequestError(
            "A parent or guardian email is required to register a student under "
            f"{settings.digital_consent_age}"
        )

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
        parental_consent_at=parental_consent_at,
        last_active_at=datetime.now(tz=timezone.utc),
        date_of_birth=data.date_of_birth,
        # A minor account is inactive until the parent confirms — this is what
        # "blocks login": authenticate() rejects inactive accounts. We chose to
        # block login (not just access) because it is the simplest correct
        # behaviour: no session is granted until verifiable consent exists.
        is_active=not is_minor_student,
    )
    db.add(user)
    await db.flush()

    consent_token: ParentConsentToken | None = None
    if is_minor_student:
        consent_token = ParentConsentToken(
            user_id=user.id,
            parent_email=str(data.parent_email),
            token=str(uuid.uuid4()),
            expires_at=datetime.now(tz=timezone.utc) + timedelta(days=7),
        )
        db.add(consent_token)
        await db.flush()

    return user, org, org_was_created, consent_token


async def confirm_parental_consent(db: AsyncSession, token: str) -> User:
    """Confirm verifiable parental consent for a minor via the emailed token.

    On success this is a single hop that:
      - marks the token used (so the link cannot be replayed),
      - records consent on the child (parental_consent_at + parental_consent_by),
      - links the parent to the child via ParentChild (creating a `parent` user
        for the parent email if one does not already exist),
      - activates the child account so they can log in.

    Raises BadRequestError on an invalid, already-used, or expired token.
    """
    from app.auth.models import ParentChild

    stmt = select(ParentConsentToken).where(
        ParentConsentToken.token == token,
        ParentConsentToken.used == False,  # noqa: E712
    )
    token_row = (await db.execute(stmt)).scalar_one_or_none()
    if not token_row:
        raise BadRequestError("Invalid or already-used consent link")
    if token_row.expires_at < datetime.now(tz=timezone.utc):
        token_row.used = True
        await db.flush()
        raise BadRequestError("This consent link has expired")

    child = (
        await db.execute(select(User).where(User.id == token_row.user_id))
    ).scalar_one_or_none()
    if not child:
        raise BadRequestError("The associated student account no longer exists")

    # Find or create a lightweight parent account so we have a user id to record
    # as the consenting actor and to link via ParentChild. The parent joins the
    # same org as the child. A real password is not set here — the parent can use
    # "forgot password" to claim the account later if they want to log in.
    parent_email = token_row.parent_email.strip().lower()
    parent = (
        await db.execute(select(User).where(User.email == parent_email))
    ).scalar_one_or_none()
    if not parent:
        parent = User(
            org_id=child.org_id,
            email=parent_email,
            hashed_password=hash_password(str(uuid.uuid4())),
            full_name="Parent / Guardian",
            role=UserRole.parent,
            consent_accepted_at=datetime.now(tz=timezone.utc),
            privacy_policy_version="1.0",
            email_verified_at=datetime.now(tz=timezone.utc),
            last_active_at=datetime.now(tz=timezone.utc),
        )
        db.add(parent)
        await db.flush()

    # Link parent → child once (avoid duplicate links on re-issue scenarios).
    existing_link = (
        await db.execute(
            select(ParentChild).where(
                ParentChild.parent_id == parent.id,
                ParentChild.child_id == child.id,
            )
        )
    ).scalar_one_or_none()
    if not existing_link:
        db.add(ParentChild(parent_id=parent.id, child_id=child.id))

    now = datetime.now(tz=timezone.utc)
    child.parental_consent_at = now
    child.parental_consent_by = parent.id
    child.is_active = True
    token_row.used = True
    token_row.confirmed_at = now
    db.add(child)
    db.add(token_row)
    await db.flush()
    return child


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise BadRequestError("Invalid email or password")

    if not user.is_active:
        raise BadRequestError("Account is deactivated")

    return user


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(User)
        .options(selectinload(User.organization))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return user
