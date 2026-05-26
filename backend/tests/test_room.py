"""Tests for the My Room gamification feature (Sprint A backend)."""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.gamification.models import UserRoomEquip, UserStreak
from tests.conftest import auth_header


@pytest_asyncio.fixture
async def _seeded_catalog(db: AsyncSession):
    """Ensure catalog is seeded before each room test."""
    from app.gamification.service import seed_room_catalog

    await seed_room_catalog(db)
    await db.flush()


@pytest_asyncio.fixture
async def rich_student(db: AsyncSession, student):
    """Student with 10000 XP -- can afford anything in the catalog."""
    db.add(UserStreak(user_id=student.id, total_xp=10000))
    await db.flush()
    return student


@pytest_asyncio.fixture
async def poor_student(db: AsyncSession, student):
    """Student with 50 XP -- cannot afford most items."""
    db.add(UserStreak(user_id=student.id, total_xp=50))
    await db.flush()
    return student


# ─── State + auto-seed ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_room_state_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/gamification/room/state")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_room_state_returns_catalog_and_defaults(
    client: AsyncClient, _seeded_catalog, rich_student
):
    """First GET auto-creates equip rows for every is_default item + returns catalog."""
    resp = await client.get(
        "/api/v1/gamification/room/state", headers=auth_header(rich_student)
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["wallet"] == 10000
    assert len(body["catalog"]) >= 30  # 36-ish items in the spec catalog

    # Should have auto-equipped default items
    assert "wall" in body["equipped"]
    assert body["equipped"]["wall"]["item_id"] == "wall-lavender"
    assert "floor" in body["equipped"]
    assert body["equipped"]["floor"]["item_id"] == "floor-wood"


@pytest.mark.asyncio
async def test_room_state_idempotent_default_seed(
    client: AsyncClient, _seeded_catalog, rich_student, db: AsyncSession
):
    """Calling /state twice should not create duplicate equip rows."""
    await client.get("/api/v1/gamification/room/state", headers=auth_header(rich_student))
    await client.get("/api/v1/gamification/room/state", headers=auth_header(rich_student))
    rows = await db.execute(
        select(UserRoomEquip).where(UserRoomEquip.user_id == rich_student.id)
    )
    slots = [r.slot for r in rows.scalars().all()]
    assert len(slots) == len(set(slots))


# ─── Equip ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_equip_affordable_item(client: AsyncClient, _seeded_catalog, rich_student):
    resp = await client.post(
        "/api/v1/gamification/room/equip",
        json={"slot": "wall", "item_id": "wall-sun"},  # 200 XP, rich student has 10000
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 200
    assert resp.json()["equipped"]["wall"]["item_id"] == "wall-sun"


@pytest.mark.asyncio
async def test_equip_locked_item_returns_403(
    client: AsyncClient, _seeded_catalog, poor_student
):
    resp = await client.post(
        "/api/v1/gamification/room/equip",
        json={"slot": "arcade", "item_id": "arcade"},  # 950 XP, poor student has 50
        headers=auth_header(poor_student),
    )
    assert resp.status_code == 403
    assert "950" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_equip_unknown_item_returns_404(
    client: AsyncClient, _seeded_catalog, rich_student
):
    resp = await client.post(
        "/api/v1/gamification/room/equip",
        json={"slot": "wall", "item_id": "not-a-real-item"},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_equip_slot_mismatch_returns_422(
    client: AsyncClient, _seeded_catalog, rich_student
):
    resp = await client.post(
        "/api/v1/gamification/room/equip",
        json={"slot": "floor", "item_id": "wall-sun"},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_equip_null_item_toggles_off(
    client: AsyncClient, _seeded_catalog, rich_student
):
    # First equip something
    await client.post(
        "/api/v1/gamification/room/equip",
        json={"slot": "lamp", "item_id": "lamp"},
        headers=auth_header(rich_student),
    )
    # Then toggle off
    resp = await client.post(
        "/api/v1/gamification/room/equip",
        json={"slot": "lamp", "item_id": None},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 200
    assert resp.json()["equipped"]["lamp"]["item_id"] is None


# ─── Layout ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_layout_movable_slot(
    client: AsyncClient, _seeded_catalog, rich_student
):
    resp = await client.post(
        "/api/v1/gamification/room/layout",
        json={"slot": "bed", "offset_dx": 2, "offset_dz": -3},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 200
    bed = resp.json()["equipped"]["bed"]
    assert bed["offset_dx"] == 2
    assert bed["offset_dz"] == -3


@pytest.mark.asyncio
async def test_layout_clamps_to_12(
    client: AsyncClient, _seeded_catalog, rich_student
):
    resp = await client.post(
        "/api/v1/gamification/room/layout",
        json={"slot": "bed", "offset_dx": 999, "offset_dz": -999},
        headers=auth_header(rich_student),
    )
    # Pydantic Field(ge=-12, le=12) rejects with 422
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_layout_non_movable_slot_returns_422(
    client: AsyncClient, _seeded_catalog, rich_student
):
    # `monitor` is tied to its parent (desk) -- never independently movable.
    resp = await client.post(
        "/api/v1/gamification/room/layout",
        json={"slot": "monitor", "offset_dx": 1, "offset_dz": 1},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_avatar_defaults_auto_equipped(
    client: AsyncClient, _seeded_catalog, rich_student
):
    """Avatar slots with is_default=True should auto-equip on first GET."""
    resp = await client.get(
        "/api/v1/gamification/room/state", headers=auth_header(rich_student)
    )
    assert resp.status_code == 200
    equipped = resp.json()["equipped"]
    assert equipped.get("avatar_hair", {}).get("item_id") == "avatar-hair-short"
    assert equipped.get("avatar_face", {}).get("item_id") == "avatar-face-smile"
    assert equipped.get("avatar_outfit", {}).get("item_id") == "avatar-outfit-tshirt"
    # No default accessory — slot stays empty.
    assert "avatar_accessory" not in equipped


@pytest.mark.asyncio
async def test_avatar_item_appears_in_catalog_with_item_type(
    client: AsyncClient, _seeded_catalog, rich_student
):
    resp = await client.get(
        "/api/v1/gamification/room/state", headers=auth_header(rich_student)
    )
    catalog = resp.json()["catalog"]
    avatar_items = [i for i in catalog if i["item_type"] == "avatar"]
    assert len(avatar_items) >= 20
    room_items = [i for i in catalog if i["item_type"] == "room"]
    assert len(room_items) >= 30


@pytest.mark.asyncio
async def test_equip_avatar_item_under_threshold_returns_403(
    client: AsyncClient, _seeded_catalog, poor_student
):
    resp = await client.post(
        "/api/v1/gamification/room/equip",
        json={"slot": "avatar_accessory", "item_id": "avatar-acc-pet"},  # 500 XP, poor has 50
        headers=auth_header(poor_student),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_layout_shelfwall_locks_x_axis(
    client: AsyncClient, _seeded_catalog, rich_student
):
    """shelfwall is wall-mounted -- x movement must be ignored, only z applied."""
    resp = await client.post(
        "/api/v1/gamification/room/layout",
        json={"slot": "shelfwall", "offset_dx": 5, "offset_dz": 3},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 200
    shelfwall = resp.json()["equipped"]["shelfwall"]
    assert shelfwall["offset_dx"] == 0  # x axis ignored for wall mount
    assert shelfwall["offset_dz"] == 3
