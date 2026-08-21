"""The one CRM surface a stranger can reach, and what it may say about a school.

Two things are being protected here. That a school's branding reaches its own
public pages — and that nothing else does, because this URL answers to anyone
who can guess a slug.
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.auth.models import Organization
from app.crm.public_router import BRANDING_FIELDS

BRAND = {
    "display_name": "Prog School",
    "logo_url": "https://cdn.example/logo.svg",
    "primary_color": "#22c55e",
    "secondary_color": "#3b82f6",
}

PRIVATE = {
    "support_email": "help@example.school",
    "support_url": "https://example.school/help",
    "favicon_url": "https://cdn.example/icon.png",
    "menu_visibility": {"paths": False},
    "secondary_is_custom": True,
}


async def _brand(db: AsyncSession, org: Organization, **extra) -> None:
    org.settings = {**(org.settings or {}), **BRAND, **extra}
    flag_modified(org, "settings")
    await db.commit()


async def test_a_school_that_set_its_colours_shows_them_to_strangers(
    client: AsyncClient, db: AsyncSession, org: Organization
):
    await _brand(db, org)

    body = (await client.get(f"/api/v1/crm/public/{org.slug}")).json()

    assert body["branding"] == BRAND


async def test_the_public_answer_carries_branding_and_nothing_further(
    client: AsyncClient, db: AsyncSession, org: Organization
):
    # The school has plenty else in settings. None of it is anyone's business
    # before they log in: a support address here would be one more thing to
    # harvest slug by slug.
    await _brand(db, org, **PRIVATE)

    body = (await client.get(f"/api/v1/crm/public/{org.slug}")).json()

    assert set(body["branding"]) == set(BRANDING_FIELDS)
    for leaked in PRIVATE:
        assert leaked not in body["branding"]
        assert leaked not in body


async def test_a_school_that_set_nothing_answers_with_empty_branding(
    client: AsyncClient, org: Organization
):
    body = (await client.get(f"/api/v1/crm/public/{org.slug}")).json()

    # Present and empty, not absent: the sign-in page needs one shape to read,
    # and "this school has no logo" is an answer rather than a missing field.
    assert body["branding"] == dict.fromkeys(BRANDING_FIELDS)
    assert body["name"] == org.name


async def test_a_slug_nobody_owns_looks_exactly_like_one_that_stopped_paying(
    client: AsyncClient, db: AsyncSession, org: Organization
):
    # Positive control first, or this test would pass against a route that does
    # not exist.
    assert (await client.get(f"/api/v1/crm/public/{org.slug}")).status_code == 200

    never_existed = await client.get("/api/v1/crm/public/no-such-school-anywhere")

    org.is_active = False
    await db.commit()
    switched_off = await client.get(f"/api/v1/crm/public/{org.slug}")

    assert never_existed.status_code == switched_off.status_code == 404
    assert never_existed.json() == switched_off.json()
