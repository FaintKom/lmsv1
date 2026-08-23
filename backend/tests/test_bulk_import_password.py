"""Bulk import produces a class the school can actually log into (specs/052).

A row without a password used to fall straight through to a generated one that
nobody ever saw: the import reported "created: 3" and the three accounts stayed
unreachable until someone reset each password by hand.
"""

from tests.conftest import auth_header

CSV = b"email,full_name,password\nimport1@test.school,Anya,\n"


async def test_default_password_applies_to_rows_without_one(client, admin):
    resp = await client.post(
        "/api/v1/admin/bulk-import-students",
        headers=auth_header(admin),
        files={"file": ("students.csv", CSV, "text/csv")},
        params={"parental_consent": "true", "default_password": "Welcome2026!"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["created"] == 1

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "import1@test.school", "password": "Welcome2026!"},
    )
    assert login.status_code == 200, login.text


async def test_short_default_password_is_refused(client, admin):
    """Eight characters is what the screen promises; the server now holds it."""
    resp = await client.post(
        "/api/v1/admin/bulk-import-students",
        headers=auth_header(admin),
        files={"file": ("students.csv", CSV, "text/csv")},
        params={"parental_consent": "true", "default_password": "short"},
    )
    assert resp.status_code == 400, resp.text
    assert "default_password" in resp.json()["detail"]


async def test_row_password_wins_over_the_default(client, admin):
    csv = b"email,full_name,password\nimport2@test.school,Pyotr,PerRow2026!\n"
    resp = await client.post(
        "/api/v1/admin/bulk-import-students",
        headers=auth_header(admin),
        files={"file": ("students.csv", csv, "text/csv")},
        params={"parental_consent": "true", "default_password": "Welcome2026!"},
    )
    assert resp.status_code == 200, resp.text

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "import2@test.school", "password": "PerRow2026!"},
    )
    assert login.status_code == 200, login.text
