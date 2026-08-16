"""CRM service: the pipeline, its history, its reminders, and conversion.

Everything here is scoped to one school. The org filter is applied where the
lead is fetched, and every child row — event, task — is reached through its
lead, so the boundary lives in one place rather than six. That is the shape
the exercises and groups modules had to be repaired into; this one starts
there.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Organization, ParentChild, User, UserRole
from app.auth.security import hash_password
from app.common.exceptions import BadRequestError, NotFoundError
from app.courses.models import Course
from app.crm.models import (
    EVENT_KINDS,
    LEAD_SOURCES,
    LEAD_STAGES,
    Lead,
    LeadEvent,
    LeadTask,
)
from app.progress.models import Enrollment


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _record(
    db: AsyncSession,
    lead: Lead,
    *,
    kind: str,
    body: str | None,
    author: User | None,
) -> LeadEvent:
    event = LeadEvent(
        lead_id=lead.id,
        author_id=author.id if author else None,
        kind=kind if kind in EVENT_KINDS else "note",
        body=body,
    )
    db.add(event)
    return event


async def get_lead(db: AsyncSession, user: User, lead_id: uuid.UUID) -> Lead:
    """Fetch one lead, refusing anything outside the caller's school."""
    query = select(Lead).where(Lead.id == lead_id)
    if user.role != UserRole.super_admin:
        query = query.where(Lead.org_id == user.org_id)
    lead = (await db.execute(query)).scalar_one_or_none()
    if lead is None:
        raise NotFoundError("Lead not found")
    return lead


async def list_leads(
    db: AsyncSession,
    user: User,
    *,
    stage: str | None = None,
    owner_id: uuid.UUID | None = None,
    search: str | None = None,
    include_closed: bool = False,
) -> list[Lead]:
    query = select(Lead)
    if user.role != UserRole.super_admin:
        query = query.where(Lead.org_id == user.org_id)
    if stage:
        query = query.where(Lead.stage == stage)
    elif not include_closed:
        # The board is about work in progress; won and lost are history, and
        # would otherwise grow without bound at the end of it.
        query = query.where(Lead.stage.notin_(("won", "lost")))
    if owner_id:
        query = query.where(Lead.owner_id == owner_id)
    if search:
        like = f"%{search}%"
        query = query.where(
            Lead.contact_name.ilike(like)
            | Lead.student_name.ilike(like)
            | Lead.contact_email.ilike(like)
            | Lead.contact_phone.ilike(like)
        )
    return list((await db.execute(query.order_by(Lead.created_at.desc()))).scalars().all())


async def create_lead(db: AsyncSession, user: User, data: dict) -> Lead:
    contact_name = (data.get("contact_name") or "").strip()
    if not contact_name:
        raise BadRequestError("A contact name is required")

    stage = data.get("stage") or "new"
    if stage not in LEAD_STAGES:
        raise BadRequestError(f"Unknown stage: {stage}")
    source = data.get("source")
    if source and source not in LEAD_SOURCES:
        raise BadRequestError(f"Unknown source: {source}")

    await _validate_course(db, user, data.get("interest_course_id"))
    owner_id = await _validate_staff(db, user, data.get("owner_id"))

    lead = Lead(
        org_id=user.org_id,
        contact_name=contact_name,
        contact_email=(data.get("contact_email") or None),
        contact_phone=(data.get("contact_phone") or None),
        student_name=(data.get("student_name") or None),
        interest_course_id=data.get("interest_course_id"),
        interest_note=(data.get("interest_note") or None),
        stage=stage,
        source=source,
        owner_id=owner_id,
    )
    db.add(lead)
    await db.flush()
    await _record(db, lead, kind="created", body=None, author=user)
    await db.flush()
    return lead


async def update_lead(db: AsyncSession, user: User, lead_id: uuid.UUID, data: dict) -> Lead:
    lead = await get_lead(db, user, lead_id)

    if "stage" in data and data["stage"] != lead.stage:
        new_stage = data["stage"]
        if new_stage not in LEAD_STAGES:
            raise BadRequestError(f"Unknown stage: {new_stage}")
        if new_stage == "won" and lead.converted_student_id is None:
            # "Won" with no pupil behind it is what makes a pipeline lie. The
            # conversion endpoint is what moves a lead here.
            raise BadRequestError("Convert the lead to mark it won")
        if new_stage == "lost" and not (data.get("lost_reason") or lead.lost_reason):
            raise BadRequestError("A reason is required to close a lead as lost")
        previous, lead.stage = lead.stage, new_stage
        await _record(db, lead, kind="stage_changed", body=f"{previous} → {new_stage}", author=user)

    if "source" in data:
        source = data["source"]
        if source and source not in LEAD_SOURCES:
            raise BadRequestError(f"Unknown source: {source}")
        lead.source = source
    if "owner_id" in data:
        lead.owner_id = await _validate_staff(db, user, data["owner_id"])
    if "interest_course_id" in data:
        await _validate_course(db, user, data["interest_course_id"])
        lead.interest_course_id = data["interest_course_id"]

    for field in (
        "contact_name",
        "contact_email",
        "contact_phone",
        "student_name",
        "interest_note",
        "lost_reason",
    ):
        if field in data:
            value = data[field]
            if field == "contact_name" and not (value or "").strip():
                raise BadRequestError("A contact name is required")
            setattr(lead, field, value or None)

    await db.flush()
    return lead


async def reopen_lead(db: AsyncSession, user: User, lead_id: uuid.UUID) -> Lead:
    """Bring a lost enquiry back, on the record it already has.

    Families change their minds. Without this a school opens a second enquiry
    for the same family, and the funnel then counts them twice while each half
    is missing what the other knows.

    It returns to `contacted` rather than `new`, because somebody has already
    spoken to them and pretending otherwise would restart a conversation that
    happened. `lost_reason` is deliberately kept: it is the record of what went
    wrong the first time, and the one thing worth reading before the second.
    """
    lead = await get_lead(db, user, lead_id)

    if lead.stage == "won" or lead.converted_student_id is not None:
        # The pupil exists. Reopening asks the office to enrol them twice.
        raise BadRequestError("This enquiry became a pupil and cannot be reopened")
    if lead.stage != "lost":
        # Answering 200 would write a "reopened" line into a history where
        # nothing was ever closed.
        raise BadRequestError("This enquiry is already open")

    lead.stage = "contacted"
    await _record(db, lead, kind="reopened", body="Reopened after being lost", author=user)
    await db.flush()
    return lead


async def delete_lead(db: AsyncSession, user: User, lead_id: uuid.UUID) -> None:
    lead = await get_lead(db, user, lead_id)
    await db.delete(lead)
    await db.flush()


async def _validate_course(db: AsyncSession, user: User, course_id: uuid.UUID | None) -> None:
    """A course id in the body is not proof the course is ours."""
    if course_id is None:
        return
    query = select(Course.id).where(Course.id == course_id)
    if user.role != UserRole.super_admin:
        query = query.where(Course.org_id == user.org_id)
    if (await db.execute(query)).scalar_one_or_none() is None:
        raise NotFoundError("Course not found")


# ── The school's own website ─────────────────────────────────────────────
#
# No caller, so no caller's org to scope by. The slug in the path is the only
# thing naming a school, which makes it the boundary: everything below resolves
# it once, to an *active* school, and works from that row rather than from
# anything else the request carried.


async def org_of(db: AsyncSession, user: User) -> Organization:
    """The caller's own school. Never a slug or an id from the request."""
    org = (
        await db.execute(select(Organization).where(Organization.id == user.org_id))
    ).scalar_one_or_none()
    if org is None:
        raise NotFoundError("School not found")
    return org


async def public_school(db: AsyncSession, slug: str) -> Organization:
    """The school behind a public URL, or nothing.

    An inactive school reads exactly like one that never existed. A school that
    has stopped paying stops collecting enquiries, and saying so in the status
    code would turn this into a directory of who our customers used to be.
    """
    org = (
        await db.execute(
            select(Organization).where(
                Organization.slug == (slug or "").strip().lower(),
                Organization.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if org is None:
        raise NotFoundError("School not found")
    return org


async def public_courses(db: AsyncSession, org: Organization) -> list[Course]:
    """What the enquiry form may offer as "interested in".

    Published only. A draft course is a plan, and a parent asking about one is
    an enquiry the school cannot answer.
    """
    from app.courses.models import CourseStatus

    rows = await db.execute(
        select(Course)
        .where(Course.org_id == org.id, Course.status == CourseStatus.published)
        .order_by(Course.title)
    )
    return list(rows.scalars().all())


async def create_public_lead(db: AsyncSession, org: Organization, data: dict) -> Lead:
    """Take an enquiry from a stranger on the school's website.

    Deliberately *not* `create_lead` with a synthetic user. That path takes an
    owner and a stage from its caller, and this caller is the open internet.
    Source, stage and owner are decided here, not accepted.
    """
    contact_name = (data.get("contact_name") or "").strip()
    if not contact_name:
        raise BadRequestError("A contact name is required")
    if not (data.get("contact_email") or data.get("contact_phone")):
        raise BadRequestError("An email address or a phone number is required")

    # A course id that is not this school's is dropped rather than refused.
    # Refusing would answer "does this id belong to you?" for any id offered.
    course_id = data.get("interest_course_id")
    if course_id is not None:
        owned = (
            await db.execute(
                select(Course.id).where(Course.id == course_id, Course.org_id == org.id)
            )
        ).scalar_one_or_none()
        course_id = owned

    lead = Lead(
        org_id=org.id,
        contact_name=contact_name,
        contact_email=(data.get("contact_email") or None),
        contact_phone=(data.get("contact_phone") or None),
        student_name=(data.get("student_name") or None),
        interest_course_id=course_id,
        interest_note=(data.get("interest_note") or None),
        stage="new",
        source="website",
        owner_id=None,
    )
    db.add(lead)
    await db.flush()
    await _record(db, lead, kind="created", body="Submitted from the school's website", author=None)
    await db.flush()
    return lead


async def _validate_staff(
    db: AsyncSession, user: User, owner_id: uuid.UUID | None
) -> uuid.UUID | None:
    """Leads are carried by staff of this school, not by any uuid supplied."""
    if owner_id is None:
        return None
    query = select(User.id).where(
        User.id == owner_id,
        User.role.in_((UserRole.admin, UserRole.teacher, UserRole.super_admin)),
    )
    if user.role != UserRole.super_admin:
        query = query.where(User.org_id == user.org_id)
    if (await db.execute(query)).scalar_one_or_none() is None:
        raise NotFoundError("Staff member not found")
    return owner_id


# ── History ──────────────────────────────────────────────────────────────


async def list_events(db: AsyncSession, user: User, lead_id: uuid.UUID) -> list[LeadEvent]:
    await get_lead(db, user, lead_id)
    rows = await db.execute(
        select(LeadEvent).where(LeadEvent.lead_id == lead_id).order_by(LeadEvent.created_at)
    )
    return list(rows.scalars().all())


async def add_event(
    db: AsyncSession, user: User, lead_id: uuid.UUID, kind: str, body: str | None
) -> LeadEvent:
    lead = await get_lead(db, user, lead_id)
    if kind not in EVENT_KINDS:
        raise BadRequestError(f"Unknown event kind: {kind}")
    if kind in ("created", "stage_changed", "converted"):
        # Those three are written by the system, so the history stays a record
        # of what happened rather than what somebody typed.
        raise BadRequestError("That event kind is recorded automatically")
    event = await _record(db, lead, kind=kind, body=body, author=user)
    await db.flush()
    return event


# ── Reminders ────────────────────────────────────────────────────────────


async def list_tasks(
    db: AsyncSession, user: User, *, lead_id: uuid.UUID | None = None, open_only: bool = True
) -> list[LeadTask]:
    query = select(LeadTask)
    if user.role != UserRole.super_admin:
        query = query.where(LeadTask.org_id == user.org_id)
    if lead_id:
        await get_lead(db, user, lead_id)
        query = query.where(LeadTask.lead_id == lead_id)
    if open_only:
        query = query.where(LeadTask.done_at.is_(None))
    return list((await db.execute(query.order_by(LeadTask.due_at))).scalars().all())


async def create_task(db: AsyncSession, user: User, lead_id: uuid.UUID, data: dict) -> LeadTask:
    lead = await get_lead(db, user, lead_id)

    title = (data.get("title") or "").strip()
    if not title:
        raise BadRequestError("A title is required")
    due_at = data.get("due_at")
    if due_at is None:
        raise BadRequestError("A due date is required")

    assignee_id = await _validate_staff(db, user, data.get("assignee_id") or user.id)

    task = LeadTask(
        lead_id=lead.id,
        org_id=lead.org_id,
        assignee_id=assignee_id,
        title=title,
        due_at=due_at,
    )
    db.add(task)
    await db.flush()
    return task


async def complete_task(db: AsyncSession, user: User, task_id: uuid.UUID) -> LeadTask:
    query = select(LeadTask).where(LeadTask.id == task_id)
    if user.role != UserRole.super_admin:
        query = query.where(LeadTask.org_id == user.org_id)
    task = (await db.execute(query)).scalar_one_or_none()
    if task is None:
        raise NotFoundError("Task not found")
    task.done_at = _now()
    await db.flush()
    return task


# ── Conversion ───────────────────────────────────────────────────────────


async def convert_lead(db: AsyncSession, user: User, lead_id: uuid.UUID, data: dict) -> dict:
    """Turn a won enquiry into the accounts and enrolment it implies.

    This is the step a general-purpose CRM cannot take, and the reason the
    module belongs inside the LMS rather than beside it: the pipeline ends
    with a pupil who can be taught tomorrow.

    Creates the student account, optionally enrols them into a course, and —
    when the enquiry came from a parent who left an address — creates the
    parent account and links it. The link is made here by the school, which is
    the only way it is allowed to be made.
    """
    lead = await get_lead(db, user, lead_id)
    if lead.converted_student_id is not None:
        raise BadRequestError("This lead has already been converted")

    student_email = (data.get("student_email") or "").strip().lower()
    if not student_email:
        raise BadRequestError("An email is required for the student account")

    existing = (
        await db.execute(select(User).where(User.email == student_email))
    ).scalar_one_or_none()
    if existing is not None:
        raise BadRequestError("An account with that email already exists")

    course_id = data.get("course_id") or lead.interest_course_id
    await _validate_course(db, user, course_id)

    now = _now()
    student = User(
        org_id=lead.org_id,
        email=student_email,
        hashed_password=hash_password(secrets.token_urlsafe(32)),
        full_name=(lead.student_name or lead.contact_name),
        role=UserRole.student,
        is_active=True,
        consent_accepted_at=now,
        privacy_policy_version="1.0",
        # School-mediated: the staff member converting the lead attests it,
        # exactly as the bulk import does.
        parental_consent_at=now,
        parental_consent_by=user.id,
        email_verified_at=now,
        last_active_at=now,
    )
    db.add(student)
    await db.flush()

    # Everybody this conversion creates gets a way in. Without it the funnel
    # ends in accounts with an unusable random password that nobody is told
    # about — which is what it did until 2026-08-16.
    invited: list[User] = [student]

    parent_id: uuid.UUID | None = None
    if data.get("create_parent_account") and lead.contact_email:
        parent_email = lead.contact_email.strip().lower()
        if parent_email != student_email:
            parent = (
                await db.execute(select(User).where(User.email == parent_email))
            ).scalar_one_or_none()
            if parent is None:
                parent = User(
                    org_id=lead.org_id,
                    email=parent_email,
                    hashed_password=hash_password(secrets.token_urlsafe(32)),
                    full_name=lead.contact_name,
                    role=UserRole.parent,
                    is_active=True,
                    consent_accepted_at=now,
                    privacy_policy_version="1.0",
                    email_verified_at=now,
                    last_active_at=now,
                )
                db.add(parent)
                await db.flush()
            if parent.org_id == lead.org_id and parent.role == UserRole.parent:
                db.add(ParentChild(parent_id=parent.id, child_id=student.id))
                parent_id = parent.id
                invited.append(parent)

    enrolled = False
    if course_id:
        db.add(Enrollment(student_id=student.id, course_id=course_id, enrolled_at=now))
        enrolled = True

    invitations_sent = await _invite(db, invited, school_name=await _school_name(db, lead.org_id))

    lead.converted_student_id = student.id
    lead.converted_at = now
    lead.stage = "won"
    await _record(db, lead, kind="converted", body=f"Enrolled as {student_email}", author=user)
    await db.flush()

    return {
        "lead_id": str(lead.id),
        "student_id": str(student.id),
        "student_email": student_email,
        "parent_id": str(parent_id) if parent_id else None,
        "enrolled": enrolled,
        # How many people were actually written to. The office needs to know
        # this rather than assume it: mail is optional in a deployment, and
        # queue_email swallows delivery failures on purpose.
        "invitations_sent": invitations_sent,
    }


async def _school_name(db: AsyncSession, org_id: uuid.UUID) -> str:
    name = await db.scalar(select(Organization.name).where(Organization.id == org_id))
    return name or "Your school"


async def _invite(db: AsyncSession, users: list[User], *, school_name: str) -> int:
    """Issue each new account a single-use invitation and email it.

    Returns how many were emailed. Accounts without an address are skipped
    rather than failing the conversion — a school may enrol a pupil who has no
    email of their own, and the guardian still gets theirs.
    """
    from app.auth.service import INVITATION_TTL_DAYS, issue_invitation_token
    from app.email.service import queue_email, send_account_invitation

    sent = 0
    expires_on = (_now() + timedelta(days=INVITATION_TTL_DAYS)).date().isoformat()
    for account in users:
        if not account.email:
            continue
        token = await issue_invitation_token(db, account)
        queue_email(
            send_account_invitation,
            account.email,
            account.full_name,
            school_name,
            token,
            expires_on,
        )
        sent += 1
    return sent


# ── Board summary ────────────────────────────────────────────────────────


async def pipeline_summary(db: AsyncSession, user: User) -> dict[str, int]:
    """Counts per stage — what the board header shows."""
    query = select(Lead.stage, func.count(Lead.id))
    if user.role != UserRole.super_admin:
        query = query.where(Lead.org_id == user.org_id)
    rows = (await db.execute(query.group_by(Lead.stage))).all()
    counts = {stage: 0 for stage in LEAD_STAGES}
    for stage, count in rows:
        counts[stage] = count
    return counts
