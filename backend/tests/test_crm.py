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


async def _invitation_for(db, user_id) -> str:
    """The single-use token conversion issued for one account."""
    from app.auth.models import PasswordResetToken

    row = (
        (
            await db.execute(
                sa_select(PasswordResetToken)
                .where(
                    PasswordResetToken.user_id == user_id,
                    PasswordResetToken.used.is_(False),
                )
                .order_by(PasswordResetToken.created_at.desc())
            )
        )
        .scalars()
        .first()
    )
    assert row is not None, "conversion issued no invitation"
    return row.token


@pytest.mark.asyncio
async def test_the_converted_pupil_can_actually_sign_in(client: AsyncClient, db, org, admin):
    """The point of the whole funnel, and what it did not do.

    Conversion created an account with a random password and told nobody, so a
    family reached the end of the pipeline and could not get in. This asserts
    the account is *usable*, not that a row exists — a row-exists test passes
    against the broken behaviour.
    """
    lead = await _lead(client, admin, student_name="Small Ada")
    converted = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/convert",
        json={"student_email": "signs.in@example.com", "create_parent_account": False},
        headers=auth_header(admin),
    )
    assert converted.status_code == 200, converted.text

    token = await _invitation_for(db, uuid.UUID(converted.json()["student_id"]))
    reset = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "chosen-by-the-family"},
    )
    assert reset.status_code == 200, reset.text

    signed_in = await client.post(
        "/api/v1/auth/login",
        json={"email": "signs.in@example.com", "password": "chosen-by-the-family"},
    )
    assert signed_in.status_code == 200, signed_in.text


@pytest.mark.asyncio
async def test_the_guardian_is_invited_too(client: AsyncClient, db, org, admin):
    lead = await _lead(
        client, admin, student_name="Small Ada", contact_email="guardian@example.com"
    )
    converted = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/convert",
        json={"student_email": "child@example.com", "create_parent_account": True},
        headers=auth_header(admin),
    )
    assert converted.status_code == 200, converted.text
    parent_id = converted.json()["parent_id"]
    assert parent_id is not None

    token = await _invitation_for(db, uuid.UUID(parent_id))
    reset = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "guardian-password"},
    )
    assert reset.status_code == 200, reset.text


@pytest.mark.asyncio
async def test_an_invitation_works_exactly_once(client: AsyncClient, db, org, admin):
    lead = await _lead(client, admin)
    converted = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/convert",
        json={"student_email": "once.only@example.com", "create_parent_account": False},
        headers=auth_header(admin),
    )
    token = await _invitation_for(db, uuid.UUID(converted.json()["student_id"]))

    first = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "first-password"},
    )
    assert first.status_code == 200

    second = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "second-password"},
    )
    assert second.status_code == 400


@pytest.mark.asyncio
async def test_conversion_reports_whether_invitations_were_sent(client: AsyncClient, org, admin):
    """An office with mail switched off must be told, not left assuming."""
    lead = await _lead(client, admin, contact_email="told@example.com")
    converted = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/convert",
        json={"student_email": "told.child@example.com", "create_parent_account": True},
        headers=auth_header(admin),
    )
    assert converted.status_code == 200, converted.text
    assert "invitations_sent" in converted.json()


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


# ── The school's own website ─────────────────────────────────────────────
#
# The public surface. Everything above this line has a signed-in administrator
# behind it; nothing below does, which is why each of these asks what an
# anonymous stranger can learn as well as what they can do.


PUBLIC = "/api/v1/crm/public"


@pytest.mark.asyncio
async def test_a_stranger_can_leave_an_enquiry_and_it_lands_on_the_board(
    client: AsyncClient, org, admin
):
    resp = await client.post(
        f"{PUBLIC}/{org.slug}/enquiries",
        json={
            "contact_name": "Passing Parent",
            "contact_email": "passing.parent@example.com",
            "student_name": "Small Passer",
            "interest_note": "Saturday mornings if possible",
        },
    )
    assert resp.status_code == 200, resp.text

    board = (await client.get("/api/v1/crm/leads", headers=auth_header(admin))).json()["items"]
    landed = [lead for lead in board if lead["contact_name"] == "Passing Parent"]
    assert len(landed) == 1
    assert landed[0]["stage"] == "new"
    assert landed[0]["source"] == "website"
    # Nobody at the school has picked it up yet, and the form cannot assign it.
    assert landed[0]["owner_id"] is None
    assert landed[0]["student_name"] == "Small Passer"


@pytest.mark.asyncio
async def test_the_form_never_says_whether_an_address_has_written_before(client: AsyncClient, org):
    """FR-019. A form that answers differently the second time is a directory
    of everyone who has enquired, readable by anyone with a browser."""
    body = {"contact_name": "Repeat Parent", "contact_email": "repeat@example.com"}

    first = await client.post(f"{PUBLIC}/{org.slug}/enquiries", json=body)
    second = await client.post(f"{PUBLIC}/{org.slug}/enquiries", json=body)

    assert first.status_code == second.status_code == 200
    assert first.content == second.content
    # And the answer carries nothing to correlate against — no id, no count.
    payload = first.json()
    assert "id" not in payload
    assert not any(isinstance(v, int) for v in payload.values())


@pytest.mark.asyncio
async def test_an_unknown_or_closed_school_reveals_nothing(client: AsyncClient, db, org):
    # The control. Without it every assertion below passes on a server with no
    # such endpoint at all, which is how a test comes to read as coverage.
    open_page = await client.get(f"{PUBLIC}/{org.slug}")
    assert open_page.status_code == 200, open_page.text

    unknown = await client.get(f"{PUBLIC}/no-such-school-{uuid.uuid4().hex[:8]}")
    assert unknown.status_code == 404

    org.is_active = False
    await db.flush()

    # A school that has stopped paying stops collecting enquiries, and says so
    # no differently than one that never existed.
    closed_page = await client.get(f"{PUBLIC}/{org.slug}")
    assert closed_page.status_code == 404
    closed_post = await client.post(
        f"{PUBLIC}/{org.slug}/enquiries",
        json={"contact_name": "Too Late", "contact_email": "late@example.com"},
    )
    assert closed_post.status_code == 404


@pytest.mark.asyncio
async def test_the_form_is_rate_limited_by_ip(client: AsyncClient, org, monkeypatch):
    monkeypatch.setattr("app.config.settings.crm_public_enquiry_rate_limit", "2/hour")
    body = {"contact_name": "Flooder", "contact_email": "flood@example.com"}

    for _ in range(2):
        allowed = await client.post(f"{PUBLIC}/{org.slug}/enquiries", json=body)
        assert allowed.status_code == 200

    blocked = await client.post(f"{PUBLIC}/{org.slug}/enquiries", json=body)
    assert blocked.status_code == 429


@pytest.mark.asyncio
async def test_a_course_from_another_school_is_dropped_not_refused(
    client: AsyncClient, db, org, org2, admin
):
    from app.auth.models import UserRole as _Role

    foreign_teacher = _make_user(db, org2, _Role.teacher, suffix="-far")
    await db.flush()
    foreign_course = await make_course(db, org2, foreign_teacher)

    resp = await client.post(
        f"{PUBLIC}/{org.slug}/enquiries",
        json={
            "contact_name": "Curious Parent",
            "contact_email": "curious@example.com",
            "interest_course_id": str(foreign_course.id),
        },
    )
    # Refusing would confirm the id is not this school's. Accepting and
    # dropping it tells the sender nothing and still cannot cross the boundary.
    assert resp.status_code == 200

    board = (await client.get("/api/v1/crm/leads", headers=auth_header(admin))).json()["items"]
    landed = [lead for lead in board if lead["contact_name"] == "Curious Parent"][0]
    assert landed["interest_course_id"] is None


@pytest.mark.asyncio
async def test_the_public_page_offers_only_this_school_and_only_published_courses(
    client: AsyncClient, db, org, teacher
):
    from app.courses.models import CourseStatus

    published = await make_course(db, org, teacher, title="Python for Beginners")
    await make_course(db, org, teacher, title="Half-Written Draft", status=CourseStatus.draft)

    page = await client.get(f"{PUBLIC}/{org.slug}")
    assert page.status_code == 200
    payload = page.json()
    assert payload["name"] == org.name
    titles = [course["title"] for course in payload["courses"]]
    assert "Python for Beginners" in titles
    assert "Half-Written Draft" not in titles
    assert str(published.id) in [course["id"] for course in payload["courses"]]
    # Nothing about the people.
    assert "leads" not in payload and "students" not in payload


@pytest.mark.asyncio
async def test_the_board_is_told_where_its_own_enquiry_page_lives(
    client: AsyncClient, org, admin, admin2
):
    """A form nobody at the school can find is a form nobody uses."""
    meta = (await client.get("/api/v1/crm/meta", headers=auth_header(admin))).json()
    assert meta["enquiry_path"] == f"/s/{org.slug}/enquire"

    # And it is the caller's own school, not whichever one asked first.
    other = (await client.get("/api/v1/crm/meta", headers=auth_header(admin2))).json()
    assert other["enquiry_path"] != meta["enquiry_path"]


# ── A closed enquiry that comes back ─────────────────────────────────────
#
# Families change their minds, and a school that cannot reopen an enquiry
# opens a second one. Two rows for one family is what makes the funnel's
# numbers wrong: the same enquiry counts twice, and whichever half is read
# first is missing the reason the first attempt failed.


@pytest.mark.asyncio
async def test_reopening_returns_a_lost_enquiry_with_its_history_intact(client: AsyncClient, admin):
    lead = await _lead(client, admin, contact_name="Came Back")
    await client.patch(
        f"/api/v1/crm/leads/{lead['id']}",
        json={"stage": "lost", "lost_reason": "Chose a school closer to home"},
        headers=auth_header(admin),
    )

    resp = await client.post(f"/api/v1/crm/leads/{lead['id']}/reopen", headers=auth_header(admin))
    assert resp.status_code == 200, resp.text
    reopened = resp.json()
    assert reopened["stage"] == "contacted"
    # Why it was lost the first time survives. It is the record of what to
    # avoid saying twice, and a school that loses it learns nothing.
    assert reopened["lost_reason"] == "Chose a school closer to home"

    events = (
        await client.get(f"/api/v1/crm/leads/{lead['id']}/events", headers=auth_header(admin))
    ).json()["items"]
    assert [e["kind"] for e in events] == ["created", "stage_changed", "reopened"]

    # And it is back on the board without asking for closed rows.
    board = (await client.get("/api/v1/crm/leads", headers=auth_header(admin))).json()["items"]
    assert lead["id"] in {row["id"] for row in board}


@pytest.mark.asyncio
async def test_a_converted_enquiry_cannot_be_reopened(client: AsyncClient, admin):
    """The pupil already exists. Reopening would ask the office to enrol them
    a second time."""
    lead = await _lead(client, admin, contact_name="Already Enrolled")
    converted = await client.post(
        f"/api/v1/crm/leads/{lead['id']}/convert",
        json={"student_email": f"reopen-{uuid.uuid4().hex[:8]}@example.com"},
        headers=auth_header(admin),
    )
    assert converted.status_code == 200

    resp = await client.post(f"/api/v1/crm/leads/{lead['id']}/reopen", headers=auth_header(admin))
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_an_open_enquiry_cannot_be_reopened(client: AsyncClient, admin):
    """There is nothing to reopen, and answering 200 would put a `reopened`
    line in a history where nothing was ever closed."""
    lead = await _lead(client, admin, contact_name="Still Open")

    resp = await client.post(f"/api/v1/crm/leads/{lead['id']}/reopen", headers=auth_header(admin))
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_another_schools_enquiry_cannot_be_reopened(client: AsyncClient, admin, admin2):
    theirs = await _lead(client, admin2, contact_name="Their lost one")
    await client.patch(
        f"/api/v1/crm/leads/{theirs['id']}",
        json={"stage": "lost", "lost_reason": "Price"},
        headers=auth_header(admin2),
    )

    # Their own administrator can. Without this the assertion below passes on a
    # server with no such endpoint, where everything answers 404.
    mine = await client.post(
        f"/api/v1/crm/leads/{theirs['id']}/reopen", headers=auth_header(admin2)
    )
    assert mine.status_code == 200, mine.text

    # Close it again so the two calls differ only in who is asking.
    await client.patch(
        f"/api/v1/crm/leads/{theirs['id']}",
        json={"stage": "lost", "lost_reason": "Price"},
        headers=auth_header(admin2),
    )

    resp = await client.post(f"/api/v1/crm/leads/{theirs['id']}/reopen", headers=auth_header(admin))
    assert resp.status_code == 404
