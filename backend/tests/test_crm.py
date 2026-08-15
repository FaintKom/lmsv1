"""The school's funnel: pipeline, history, reminders, conversion.

Written alongside the module rather than after an incident, so the cases that
bit every other tenant-scoped module in this codebase are here from the start:
a foreign id in the body, a foreign id in the path, and a stage that claims
something the data does not support.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select as sa_select

from app.auth.models import UserRole
from tests.conftest import _make_user, auth_header, make_course


def _due(days: int = 1) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


async def _lead(client: AsyncClient, who, **overrides) -> dict:
    body = {"contact_name": "Ada Parent", "contact_email": "ada.parent@example.com"}
    body.update(overrides)
    resp = await client.post("/api/v1/crm/leads", json=body, headers=auth_header(who))
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── The pipeline ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_a_new_enquiry_starts_in_new_and_records_its_creation(client: AsyncClient, admin):
    lead = await _lead(client, admin, student_name="Small Ada")
    assert lead["stage"] == "new"
    assert lead["student_name"] == "Small Ada"

    history = await client.get(f"/api/v1/crm/leads/{lead['id']}/events", headers=auth_header(admin))
    assert [e["kind"] for e in history.json()["items"]] == ["created"]


@pytest.mark.asyncio
async def test_moving_a_stage_is_written_into_the_history(client: AsyncClient, admin):
    lead = await _lead(client, admin)

    moved = await client.patch(
        f"/api/v1/crm/leads/{lead['id']}",
        json={"stage": "contacted"},
        headers=auth_header(admin),
    )
    assert moved.status_code == 200
    assert moved.json()["stage"] == "contacted"

    events = (
        await client.get(f"/api/v1/crm/leads/{lead['id']}/events", headers=auth_header(admin))
    ).json()["items"]
    assert [e["kind"] for e in events] == ["created", "stage_changed"]
    assert "new → contacted" in events[-1]["body"]


@pytest.mark.asyncio
async def test_losing_a_lead_requires_saying_why(client: AsyncClient, admin):
    """The one field here that improves next term's decisions."""
    lead = await _lead(client, admin)

    refused = await client.patch(
        f"/api/v1/crm/leads/{lead['id']}",
        json={"stage": "lost"},
        headers=auth_header(admin),
    )
    assert refused.status_code == 400

    accepted = await client.patch(
        f"/api/v1/crm/leads/{lead['id']}",
        json={"stage": "lost", "lost_reason": "Chose a school closer to home"},
        headers=auth_header(admin),
    )
    assert accepted.status_code == 200
    assert accepted.json()["stage"] == "lost"


@pytest.mark.asyncio
async def test_won_cannot_be_set_by_hand(client: AsyncClient, admin):
    """A pipeline that can be marked won with no pupil behind it lies to the
    person reading the numbers."""
    lead = await _lead(client, admin)

    resp = await client.patch(
        f"/api/v1/crm/leads/{lead['id']}",
        json={"stage": "won"},
        headers=auth_header(admin),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_the_board_hides_closed_leads_unless_asked(client: AsyncClient, admin):
    open_lead = await _lead(client, admin, contact_name="Still Talking")
    closed = await _lead(client, admin, contact_name="Went Elsewhere")
    await client.patch(
        f"/api/v1/crm/leads/{closed['id']}",
        json={"stage": "lost", "lost_reason": "Price"},
        headers=auth_header(admin),
    )

    board = (await client.get("/api/v1/crm/leads", headers=auth_header(admin))).json()["items"]
    ids = {row["id"] for row in board}
    assert open_lead["id"] in ids
    assert closed["id"] not in ids

    everything = (
        await client.get("/api/v1/crm/leads?include_closed=true", headers=auth_header(admin))
    ).json()["items"]
    assert closed["id"] in {row["id"] for row in everything}


# ── Ids that arrive in the body ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_a_course_from_another_school_cannot_be_the_interest(
    client: AsyncClient, db, org2, admin, admin2
):
    their_course = await make_course(db, org2, admin2)

    resp = await client.post(
        "/api/v1/crm/leads",
        json={"contact_name": "Ada", "interest_course_id": str(their_course.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_an_owner_from_another_school_is_refused(client: AsyncClient, db, org2, admin):
    outsider = _make_user(db, org2, UserRole.teacher, suffix="-outsider")
    await db.flush()

    resp = await client.post(
        "/api/v1/crm/leads",
        json={"contact_name": "Ada", "owner_id": str(outsider.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_a_student_cannot_be_made_the_owner_of_a_lead(client: AsyncClient, db, org, admin):
    pupil = _make_user(db, org, UserRole.student, suffix="-notstaff")
    await db.flush()

    resp = await client.post(
        "/api/v1/crm/leads",
        json={"contact_name": "Ada", "owner_id": str(pupil.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 404


# ── Ids that arrive in the path ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_another_schools_lead_is_invisible(client: AsyncClient, admin, admin2):
    """Two admins, two schools, one id."""
    theirs = await _lead(client, admin2, contact_name="Their enquiry")

    read = await client.get(f"/api/v1/crm/leads/{theirs['id']}", headers=auth_header(admin))
    assert read.status_code == 404

    edited = await client.patch(
        f"/api/v1/crm/leads/{theirs['id']}",
        json={"contact_name": "Hijacked"},
        headers=auth_header(admin),
    )
    assert edited.status_code == 404

    history = await client.get(
        f"/api/v1/crm/leads/{theirs['id']}/events", headers=auth_header(admin)
    )
    assert history.status_code == 404

    removed = await client.delete(f"/api/v1/crm/leads/{theirs['id']}", headers=auth_header(admin))
    assert removed.status_code == 404


@pytest.mark.asyncio
async def test_teachers_and_students_do_not_see_the_funnel(
    client: AsyncClient, teacher, student, parent
):
    """The pipeline is the office's business, not the staff room's."""
    for who in (teacher, student, parent):
        resp = await client.get("/api/v1/crm/leads", headers=auth_header(who))
        assert resp.status_code == 403


# ── History ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_a_call_can_be_logged_but_a_stage_change_cannot_be_faked(client: AsyncClient, admin):
    lead = await _lead(client, admin)

    logged = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/events",
        json={"kind": "call", "body": "Rang, no answer"},
        headers=auth_header(admin),
    )
    assert logged.status_code == 200

    faked = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/events",
        json={"kind": "stage_changed", "body": "new → won"},
        headers=auth_header(admin),
    )
    assert faked.status_code == 400


# ── Reminders ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_a_reminder_belongs_to_its_lead_and_can_be_closed(client: AsyncClient, admin):
    lead = await _lead(client, admin)

    created = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/tasks",
        json={"title": "Ring back Tuesday", "due_at": _due(2)},
        headers=auth_header(admin),
    )
    assert created.status_code == 200
    task = created.json()

    open_tasks = (await client.get("/api/v1/crm/tasks", headers=auth_header(admin))).json()
    assert task["id"] in {t["id"] for t in open_tasks["items"]}

    done = await client.post(f"/api/v1/crm/tasks/{task['id']}/done", headers=auth_header(admin))
    assert done.status_code == 200
    assert done.json()["done_at"] is not None

    still_open = (await client.get("/api/v1/crm/tasks", headers=auth_header(admin))).json()
    assert task["id"] not in {t["id"] for t in still_open["items"]}


@pytest.mark.asyncio
async def test_a_reminder_on_another_schools_lead_is_refused(client: AsyncClient, admin, admin2):
    theirs = await _lead(client, admin2)

    resp = await client.post(
        f"/api/v1/crm/leads/{theirs['id']}/tasks",
        json={"title": "Poke", "due_at": _due()},
        headers=auth_header(admin),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_the_reminder_sweep_notifies_once(client: AsyncClient, db, admin):
    """The job behind the reminders, driven with the test's own session.

    Notifying every morning until a task is closed would train people to
    ignore the bell, so the second sweep must find nothing.
    """
    from app.crm.models import LeadTask
    from app.notifications.models import Notification
    from app.scheduler import _sweep_crm_task_reminders

    lead = await _lead(client, admin)
    created = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/tasks",
        json={"title": "Overdue call", "due_at": _due(-1)},
        headers=auth_header(admin),
    )
    assert created.status_code == 200

    first = await _sweep_crm_task_reminders(db)
    second = await _sweep_crm_task_reminders(db)
    assert first == 1
    assert second == 0

    notes = (
        (
            await db.execute(
                sa_select(Notification).where(
                    Notification.user_id == admin.id,
                    Notification.title == "Follow-up due",
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(notes) == 1

    task = await db.get(LeadTask, uuid.UUID(created.json()["id"]))
    assert task.notified is True


# ── Conversion ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_converting_creates_the_pupil_the_parent_and_the_enrolment(
    client: AsyncClient, db, org, admin
):
    """The step a general-purpose CRM cannot take."""
    from app.auth.models import ParentChild, User
    from app.progress.models import Enrollment

    course = await make_course(db, org, admin)
    lead = await _lead(client, admin, student_name="Small Ada", interest_course_id=str(course.id))

    resp = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/convert",
        json={"student_email": "small.ada@example.com", "create_parent_account": True},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200, resp.text
    result = resp.json()
    assert result["enrolled"] is True
    assert result["parent_id"] is not None

    student = await db.get(User, uuid.UUID(result["student_id"]))
    assert student.role == UserRole.student
    assert student.org_id == org.id
    assert student.full_name == "Small Ada"

    linked = (
        await db.execute(sa_select(ParentChild).where(ParentChild.child_id == student.id))
    ).scalar_one_or_none()
    assert linked is not None

    enrolment = (
        await db.execute(
            sa_select(Enrollment).where(
                Enrollment.student_id == student.id, Enrollment.course_id == course.id
            )
        )
    ).scalar_one_or_none()
    assert enrolment is not None

    after = (await client.get(f"/api/v1/crm/leads/{lead['id']}", headers=auth_header(admin))).json()
    assert after["stage"] == "won"
    assert after["converted_student_id"] == result["student_id"]


@pytest.mark.asyncio
async def test_a_lead_converts_only_once(client: AsyncClient, admin):
    lead = await _lead(client, admin)
    first = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/convert",
        json={"student_email": "once@example.com"},
        headers=auth_header(admin),
    )
    assert first.status_code == 200

    second = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/convert",
        json={"student_email": "twice@example.com"},
        headers=auth_header(admin),
    )
    assert second.status_code == 400


@pytest.mark.asyncio
async def test_conversion_refuses_an_address_already_in_use(client: AsyncClient, db, org, admin):
    existing = _make_user(db, org, UserRole.student, suffix="-taken")
    await db.flush()

    lead = await _lead(client, admin)
    resp = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/convert",
        json={"student_email": existing.email},
        headers=auth_header(admin),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_the_summary_counts_every_stage(client: AsyncClient, admin):
    await _lead(client, admin, contact_name="One")
    second = await _lead(client, admin, contact_name="Two")
    await client.patch(
        f"/api/v1/crm/leads/{second['id']}",
        json={"stage": "contacted"},
        headers=auth_header(admin),
    )

    summary = (await client.get("/api/v1/crm/summary", headers=auth_header(admin))).json()
    assert summary["new"] >= 1
    assert summary["contacted"] >= 1
    assert "won" in summary and "lost" in summary
