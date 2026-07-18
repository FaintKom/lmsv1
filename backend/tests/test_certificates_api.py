"""Tests for certificate endpoints — ownership on download, public verify."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_my_certificates_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/certificates/my-certificates")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_verify_unknown_number_invalid(client: AsyncClient):
    resp = await client.get("/api/v1/certificates/verify/CERT-DOES-NOT-EXIST")
    assert resp.status_code == 200
    assert resp.json()["valid"] is False


@pytest.mark.asyncio
async def test_download_foreign_certificate_404(client: AsyncClient, student):
    """A cert id that isn't yours (or doesn't exist) must 404, not leak HTML."""
    resp = await client.get(
        "/api/v1/certificates/00000000-0000-0000-0000-000000000000/download",
        headers=auth_header(student),
    )
    assert resp.status_code == 404
