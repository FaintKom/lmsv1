"""CRM endpoints — the school's own funnel.

Admin-only. A school's pipeline is the office's business, not the staff
room's: teachers get the pupils, not the enquiries. ``require_role`` lets the
super admin through as it does everywhere else, and the org scoping happens in
the service.

Mounted at /api/v1/crm.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.crm import service
from app.crm.models import (
    EVENT_KINDS,
    LEAD_SOURCES,
    LEAD_STAGES,
    Lead,
    LeadEvent,
    LeadTask,
)
from app.db.session import get_db

router = APIRouter()

_STAFF = (UserRole.admin,)


class LeadCreateRequest(BaseModel):
    contact_name: str = Field(min_length=1, max_length=255)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(default=None, max_length=50)
    student_name: str | None = Field(default=None, max_length=255)
    interest_course_id: uuid.UUID | None = None
    interest_note: str | None = Field(default=None, max_length=500)
    stage: str | None = None
    source: str | None = None
    owner_id: uuid.UUID | None = None


class LeadUpdateRequest(BaseModel):
    """Partial — only the keys present are touched."""

    contact_name: str | None = Field(default=None, max_length=255)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(default=None, max_length=50)
    student_name: str | None = Field(default=None, max_length=255)
    interest_course_id: uuid.UUID | None = None
    interest_note: str | None = Field(default=None, max_length=500)
    stage: str | None = None
    source: str | None = None
    owner_id: uuid.UUID | None = None
    lost_reason: str | None = Field(default=None, max_length=500)


class EventCreateRequest(BaseModel):
    kind: str = "note"
    body: str | None = None


class TaskCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    due_at: datetime
    assignee_id: uuid.UUID | None = None


class ConvertRequest(BaseModel):
    student_email: EmailStr
    course_id: uuid.UUID | None = None
    create_parent_account: bool = True


def _lead_json(lead: Lead) -> dict:
    return {
        "id": str(lead.id),
        "contact_name": lead.contact_name,
        "contact_email": lead.contact_email,
        "contact_phone": lead.contact_phone,
        "student_name": lead.student_name,
        "interest_course_id": str(lead.interest_course_id) if lead.interest_course_id else None,
        "interest_note": lead.interest_note,
        "stage": lead.stage,
        "source": lead.source,
        "owner_id": str(lead.owner_id) if lead.owner_id else None,
        "lost_reason": lead.lost_reason,
        "converted_student_id": (
            str(lead.converted_student_id) if lead.converted_student_id else None
        ),
        "converted_at": lead.converted_at.isoformat() if lead.converted_at else None,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


def _event_json(event: LeadEvent) -> dict:
    return {
        "id": str(event.id),
        "kind": event.kind,
        "body": event.body,
        "author_id": str(event.author_id) if event.author_id else None,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


def _task_json(task: LeadTask) -> dict:
    return {
        "id": str(task.id),
        "lead_id": str(task.lead_id),
        "title": task.title,
        "due_at": task.due_at.isoformat(),
        "done_at": task.done_at.isoformat() if task.done_at else None,
        "assignee_id": str(task.assignee_id) if task.assignee_id else None,
    }


@router.get("/meta")
async def crm_meta(user: User = Depends(require_role(*_STAFF))):
    """The vocabulary the board is built from — stages, sources, event kinds."""
    return {
        "stages": list(LEAD_STAGES),
        "sources": list(LEAD_SOURCES),
        "event_kinds": list(EVENT_KINDS),
    }


@router.get("/leads")
async def list_leads_endpoint(
    stage: str | None = Query(None),
    owner_id: uuid.UUID | None = Query(None),
    search: str | None = Query(None, max_length=200),
    include_closed: bool = Query(False),
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    leads = await service.list_leads(
        db, user, stage=stage, owner_id=owner_id, search=search, include_closed=include_closed
    )
    return {"items": [_lead_json(lead) for lead in leads]}


@router.get("/summary")
async def summary_endpoint(
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    return await service.pipeline_summary(db, user)


@router.post("/leads")
async def create_lead_endpoint(
    data: LeadCreateRequest,
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    lead = await service.create_lead(db, user, data.model_dump(exclude_unset=True))
    return _lead_json(lead)


@router.get("/leads/{lead_id}")
async def get_lead_endpoint(
    lead_id: uuid.UUID,
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    lead = await service.get_lead(db, user, lead_id)
    return _lead_json(lead)


@router.patch("/leads/{lead_id}")
async def update_lead_endpoint(
    lead_id: uuid.UUID,
    data: LeadUpdateRequest,
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    lead = await service.update_lead(db, user, lead_id, data.model_dump(exclude_unset=True))
    return _lead_json(lead)


@router.delete("/leads/{lead_id}")
async def delete_lead_endpoint(
    lead_id: uuid.UUID,
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_lead(db, user, lead_id)
    return {"status": "ok"}


@router.get("/leads/{lead_id}/events")
async def list_events_endpoint(
    lead_id: uuid.UUID,
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    events = await service.list_events(db, user, lead_id)
    return {"items": [_event_json(e) for e in events]}


@router.post("/leads/{lead_id}/events")
async def add_event_endpoint(
    lead_id: uuid.UUID,
    data: EventCreateRequest,
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    event = await service.add_event(db, user, lead_id, data.kind, data.body)
    return _event_json(event)


@router.get("/tasks")
async def list_tasks_endpoint(
    lead_id: uuid.UUID | None = Query(None),
    open_only: bool = Query(True),
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    tasks = await service.list_tasks(db, user, lead_id=lead_id, open_only=open_only)
    return {"items": [_task_json(t) for t in tasks]}


@router.post("/leads/{lead_id}/tasks")
async def create_task_endpoint(
    lead_id: uuid.UUID,
    data: TaskCreateRequest,
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    task = await service.create_task(db, user, lead_id, data.model_dump())
    return _task_json(task)


@router.post("/tasks/{task_id}/done")
async def complete_task_endpoint(
    task_id: uuid.UUID,
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    task = await service.complete_task(db, user, task_id)
    return _task_json(task)


@router.post("/leads/{lead_id}/convert")
async def convert_lead_endpoint(
    lead_id: uuid.UUID,
    data: ConvertRequest,
    user: User = Depends(require_role(*_STAFF)),
    db: AsyncSession = Depends(get_db),
):
    """Create the pupil — and the parent, and the enrolment — this enquiry implies."""
    return await service.convert_lead(db, user, lead_id, data.model_dump())
