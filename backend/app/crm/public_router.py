"""The one part of the CRM a stranger can reach.

Its own file, and its own mount at /api/v1/crm/public, so the public surface of
this module is visible in the file tree rather than discovered by reading
decorators. Everything in `router.py` demands an administrator; nothing here
demands anybody, which is a difference worth being able to see at a glance.

Two endpoints: what the school's enquiry page needs to render, and the
enquiry itself.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.rate_limit import limiter
from app.config import settings
from app.crm import service
from app.db.session import get_db

router = APIRouter()


class PublicEnquiryRequest(BaseModel):
    contact_name: str = Field(min_length=1, max_length=255)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(default=None, max_length=50)
    student_name: str | None = Field(default=None, max_length=255)
    interest_course_id: uuid.UUID | None = None
    interest_note: str | None = Field(default=None, max_length=500)


#: What a stranger may learn about how a school looks. Deliberately short:
#: everything outside this list — support contact, menu layout, tab icon —
#: belongs to somebody who has logged in, and every extra field here is one
#: more thing that could be collected across every slug in turn.
BRANDING_FIELDS = ("display_name", "logo_url", "primary_color", "secondary_color")


@router.get("/{org_slug}")
@limiter.limit(lambda: settings.crm_public_school_rate_limit)
async def public_school_page(
    request: Request,  # slowapi reads it positionally; also where the IP comes from
    response: Response,  # and this one carries the rate-limit headers
    org_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Enough to render the school's enquiry page and its sign-in screen.

    A name, some course titles, and how the school looks. Nothing about pupils,
    staff or who else has written in — this URL is as public as the school's
    front door.

    Rate-limited since 2026-08-21. It used to be quiet, read once by the enquiry
    page; the branded sign-in screen asks for it every time somebody opens the
    login form, which makes an unauthenticated database query worth bounding.
    """
    org = await service.public_school(db, org_slug)
    courses = await service.public_courses(db, org)
    org_settings = org.settings or {}
    return {
        "name": org.name,
        "slug": org.slug,
        "courses": [{"id": str(c.id), "title": c.title} for c in courses],
        "branding": {field: org_settings.get(field) for field in BRANDING_FIELDS},
    }


@router.post("/{org_slug}/enquiries")
@limiter.limit(lambda: settings.crm_public_enquiry_rate_limit)
async def submit_public_enquiry(
    request: Request,  # slowapi needs it, and it is where the IP comes from
    response: Response,  # and it needs this one to write the rate-limit headers
    org_slug: str,
    data: PublicEnquiryRequest,
    db: AsyncSession = Depends(get_db),
):
    """Take an enquiry from the school's website.

    The answer is the same every time: same status, same body, whether this is
    a first enquiry or a fifth from the same address. Anything that varied
    would make this form a way to ask who has been in touch (FR-019), and the
    people it would answer about are children and their parents.
    """
    org = await service.public_school(db, org_slug)
    await service.create_public_lead(db, org, data.model_dump())
    return {"status": "received"}
