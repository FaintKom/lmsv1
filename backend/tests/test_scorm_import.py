"""Tests for SCORM/xAPI package import — zip validation, tenancy, file serving."""

import io
import zipfile

import pytest
from httpx import AsyncClient

from app.auth.security import create_access_token
from tests.conftest import auth_header

_MANIFEST = """<?xml version="1.0"?>
<manifest identifier="test" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <organizations default="org1">
    <organization identifier="org1"><title>Test Package</title>
      <item identifier="item1" identifierref="res1"><title>Lesson</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" type="webcontent" href="index.html"/>
  </resources>
</manifest>
"""


def _scorm_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("imsmanifest.xml", _MANIFEST)
        zf.writestr("index.html", "<html><body>hi</body></html>")
    return buf.getvalue()


def _traversal_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("imsmanifest.xml", _MANIFEST)
        zf.writestr("../evil.txt", "escaped")
    return buf.getvalue()


async def _upload(client: AsyncClient, user, data: bytes, name="pkg.zip"):
    return await client.post(
        "/api/v1/scorm-import/upload",
        files={"file": (name, data, "application/zip")},
        headers=auth_header(user),
    )


@pytest.mark.asyncio
async def test_student_cannot_upload(client: AsyncClient, student):
    resp = await _upload(client, student, _scorm_zip())
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_non_zip_rejected(client: AsyncClient, teacher):
    resp = await _upload(client, teacher, b"definitely not a zip")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_traversal_entry_rejected(client: AsyncClient, teacher):
    resp = await _upload(client, teacher, _traversal_zip())
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_extracts_and_detects_scorm(client: AsyncClient, teacher):
    resp = await _upload(client, teacher, _scorm_zip())
    assert resp.status_code == 201
    pkg = resp.json()
    assert pkg["status"] == "extracted"
    assert pkg["launch_url"] == "index.html"

    got = await client.get(
        f"/api/v1/scorm-import/packages/{pkg['id']}", headers=auth_header(teacher)
    )
    assert got.status_code == 200


@pytest.mark.asyncio
async def test_package_invisible_cross_org(client: AsyncClient, teacher, admin2):
    pkg = (await _upload(client, teacher, _scorm_zip())).json()
    resp = await client.get(
        f"/api/v1/scorm-import/packages/{pkg['id']}", headers=auth_header(admin2)
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_launch_token_scoped_to_package(client: AsyncClient, teacher, admin2):
    """Launch token serves its own package's files and nothing else."""
    pkg_a = (await _upload(client, teacher, _scorm_zip())).json()
    pkg_b = (await _upload(client, teacher, _scorm_zip())).json()

    minted = await client.post(
        f"/api/v1/scorm-import/packages/{pkg_a['id']}/launch-token",
        headers=auth_header(teacher),
    )
    assert minted.status_code == 200
    scorm_token = minted.json()["token"]

    ok = await client.get(
        f"/api/v1/scorm-import/packages/{pkg_a['id']}/files/index.html",
        params={"token": scorm_token},
    )
    assert ok.status_code == 200

    # Same token against a DIFFERENT package — refused.
    other = await client.get(
        f"/api/v1/scorm-import/packages/{pkg_b['id']}/files/index.html",
        params={"token": scorm_token},
    )
    assert other.status_code == 401

    # Cross-org caller cannot mint a token at all.
    cross = await client.post(
        f"/api/v1/scorm-import/packages/{pkg_a['id']}/launch-token",
        headers=auth_header(admin2),
    )
    assert cross.status_code == 404


@pytest.mark.asyncio
async def test_serve_file_with_token_and_refuse_traversal(client: AsyncClient, teacher):
    pkg = (await _upload(client, teacher, _scorm_zip())).json()
    token = create_access_token({"sub": str(teacher.id)})

    ok = await client.get(
        f"/api/v1/scorm-import/packages/{pkg['id']}/files/index.html",
        params={"token": token},
    )
    assert ok.status_code == 200

    bad = await client.get(
        f"/api/v1/scorm-import/packages/{pkg['id']}/files/%2e%2e/%2e%2e/etc/passwd",
        params={"token": token},
    )
    assert bad.status_code in (400, 404)

    unauth = await client.get(f"/api/v1/scorm-import/packages/{pkg['id']}/files/index.html")
    assert unauth.status_code == 401
