"""Child-safety blockers #3 (parental consent) + #4 (self-service erasure).

Covers:
- /auth/register rejects a student account unless parental_consent_accepted.
- /auth/register accepts a student with consent and records parental_consent_at.
- /auth/register for a teacher (new org) needs no parental consent.
- DELETE /auth/me requires the correct password and erases the account.
- /admin/bulk-enroll and /admin/bulk-import-students refuse to create child
  accounts without the parental-consent attestation.
"""
import uuid

from sqlalchemy import select

from app.auth.models import User, UserRole
from tests.conftest import auth_header


# ---------------------------------------------------------------------------
# #3 — parental consent on self-service registration
# ---------------------------------------------------------------------------
async def test_register_student_without_parental_consent_rejected(client, org):
    payload = {
        "org_name": "",
        "org_id": str(org.id),
        "full_name": "Kid Nopermission",
        "email": f"kid-{uuid.uuid4().hex[:6]}@test.com",
        "password": "ChildPass123!",
        "role": "student",
        "consent_accepted": True,
        "parental_consent_accepted": False,
    }
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 400
    assert "parent" in r.json()["detail"].lower()


async def test_register_student_with_parental_consent_ok(client, db, org):
    email = f"kid-{uuid.uuid4().hex[:6]}@test.com"
    payload = {
        "org_name": "",
        "org_id": str(org.id),
        "full_name": "Kid Withpermission",
        "email": email,
        "password": "ChildPass123!",
        "role": "student",
        "consent_accepted": True,
        "parental_consent_accepted": True,
    }
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text

    created = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one()
    assert created.role == UserRole.student
    assert created.parental_consent_at is not None
    # Self-service path: no staff actor attests, so the "by" stays null.
    assert created.parental_consent_by is None


async def test_register_teacher_needs_no_parental_consent(client, db):
    email = f"teach-{uuid.uuid4().hex[:6]}@test.com"
    payload = {
        "org_name": f"New School {uuid.uuid4().hex[:6]}",
        "full_name": "Ms Teacher",
        "email": email,
        "password": "TeachPass123!",
        "role": "teacher",
        "consent_accepted": True,
        "parental_consent_accepted": False,
    }
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text

    created = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one()
    # Founding teacher of a brand-new org is promoted to admin.
    assert created.role == UserRole.admin
    assert created.parental_consent_at is None


# ---------------------------------------------------------------------------
# #4a — self-service erasure (DELETE /auth/me)
# ---------------------------------------------------------------------------
async def test_delete_me_wrong_password_rejected(client, db, student):
    r = await client.delete(
        "/api/v1/auth/me",
        headers=auth_header(student),
        json={"password": "WrongPassword!"},
    )
    assert r.status_code == 400
    # Account must still exist.
    still = (
        await db.execute(select(User).where(User.id == student.id))
    ).scalar_one_or_none()
    assert still is not None


async def test_delete_me_correct_password_erases(client, db, student):
    sid = student.id
    r = await client.delete(
        "/api/v1/auth/me",
        headers=auth_header(student),
        json={"password": "TestPass123!"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True

    gone = (
        await db.execute(select(User).where(User.id == sid))
    ).scalar_one_or_none()
    assert gone is None


# ---------------------------------------------------------------------------
# #3 — parental consent on staff-driven bulk creation
# ---------------------------------------------------------------------------
async def test_bulk_enroll_without_consent_rejected(client, admin):
    r = await client.post(
        "/api/v1/admin/bulk-enroll",
        headers=auth_header(admin),
        json={
            "course_id": str(uuid.uuid4()),
            "rows": [{"email": "x@test.com", "full_name": "X"}],
            # parental_consent omitted
        },
    )
    assert r.status_code == 400
    assert "parental_consent" in r.json()["detail"]


async def test_bulk_import_students_without_consent_rejected(client, admin):
    r = await client.post(
        "/api/v1/admin/bulk-import-students",
        headers=auth_header(admin),
        files={"file": ("students.csv", b"name,email\nX,x@test.com\n", "text/csv")},
        # parental_consent query param defaults to False
    )
    assert r.status_code == 400
    assert "parental_consent" in r.json()["detail"]
