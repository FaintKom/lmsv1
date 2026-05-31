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
    # `wall` is a slot but isn't in ROOM_MOVABLE_SLOTS (you don't drag walls).
    resp = await client.post(
        "/api/v1/gamification/room/layout",
        json={"slot": "wall", "offset_dx": 1, "offset_dz": 1},
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
async def test_layout_shelfwall_now_free_in_x(
    client: AsyncClient, _seeded_catalog, rich_student
):
    """User explicitly allowed clipping through walls; shelfwall has full freedom."""
    resp = await client.post(
        "/api/v1/gamification/room/layout",
        json={"slot": "shelfwall", "offset_dx": 5, "offset_dz": 3, "offset_rot": 0},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 200
    shelfwall = resp.json()["equipped"]["shelfwall"]
    assert shelfwall["offset_dx"] == 5
    assert shelfwall["offset_dz"] == 3


@pytest.mark.asyncio
async def test_layout_y_axis_clamped(
    client: AsyncClient, _seeded_catalog, rich_student
):
    """offset_dy stored within [-24, 24]; Pydantic Field rejects out-of-range."""
    resp = await client.post(
        "/api/v1/gamification/room/layout",
        json={"slot": "bed", "offset_dx": 0, "offset_dy": 10, "offset_dz": 0, "offset_rot": 0},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 200
    assert resp.json()["equipped"]["bed"]["offset_dy"] == 10

    bad = await client.post(
        "/api/v1/gamification/room/layout",
        json={"slot": "bed", "offset_dx": 0, "offset_dy": 999, "offset_dz": 0},
        headers=auth_header(rich_student),
    )
    assert bad.status_code == 422


@pytest.mark.asyncio
async def test_layout_rotation_normalized(
    client: AsyncClient, _seeded_catalog, rich_student
):
    """offset_rot is stored mod 360."""
    resp = await client.post(
        "/api/v1/gamification/room/layout",
        json={"slot": "bed", "offset_dx": 0, "offset_dz": 0, "offset_rot": 730},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 200
    assert resp.json()["equipped"]["bed"]["offset_rot"] == 10  # 730 % 360 = 10


@pytest.mark.asyncio
async def test_layout_avatar_virtual_slot(
    client: AsyncClient, _seeded_catalog, rich_student
):
    """The 'avatar' slot is movable + rotatable even though no item_id is bound."""
    resp = await client.post(
        "/api/v1/gamification/room/layout",
        json={"slot": "avatar", "offset_dx": 3, "offset_dz": -2, "offset_rot": 90},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 200
    avatar = resp.json()["equipped"]["avatar"]
    assert avatar["offset_dx"] == 3
    assert avatar["offset_dz"] == -2
    assert avatar["offset_rot"] == 90


# ─── Freeform placed items ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_place_item_appears_in_state(
    client: AsyncClient, _seeded_catalog, rich_student
):
    resp = await client.post(
        "/api/v1/gamification/room/placed",
        json={"item_id": "bed-basic", "x": 3.0, "y": 0, "z": 4.0, "rot": 90, "scale": 1},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 200
    placed = resp.json()["placed"]
    assert len(placed) == 1
    assert placed[0]["item_id"] == "bed-basic"
    assert placed[0]["x"] == 3.0 and placed[0]["rot"] == 90


@pytest.mark.asyncio
async def test_place_is_one_copy_per_item(
    client: AsyncClient, _seeded_catalog, rich_student
):
    """Placing the same item again does NOT duplicate — one copy per item."""
    for _ in range(3):
        await client.post(
            "/api/v1/gamification/room/placed",
            json={"item_id": "plant", "x": 1, "y": 0, "z": 1, "rot": 0, "scale": 1},
            headers=auth_header(rich_student),
        )
    resp = await client.get(
        "/api/v1/gamification/room/state", headers=auth_header(rich_student)
    )
    plants = [p for p in resp.json()["placed"] if p["item_id"] == "plant"]
    assert len(plants) == 1  # one copy only


@pytest.mark.asyncio
async def test_place_avatar_item_rejected(
    client: AsyncClient, _seeded_catalog, rich_student
):
    resp = await client.post(
        "/api/v1/gamification/room/placed",
        json={"item_id": "avatar-hair-short", "x": 1, "y": 0, "z": 1, "rot": 0, "scale": 1},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 422  # not_placeable


@pytest.mark.asyncio
async def test_place_wall_setting_rejected(
    client: AsyncClient, _seeded_catalog, rich_student
):
    resp = await client.post(
        "/api/v1/gamification/room/placed",
        json={"item_id": "wall-sun", "x": 1, "y": 0, "z": 1, "rot": 0, "scale": 1},
        headers=auth_header(rich_student),
    )
    assert resp.status_code == 422  # wall is a setting, not placeable


@pytest.mark.asyncio
async def test_place_locked_when_too_poor(
    client: AsyncClient, _seeded_catalog, poor_student
):
    resp = await client.post(
        "/api/v1/gamification/room/placed",
        json={"item_id": "arcade", "x": 1, "y": 0, "z": 1, "rot": 0, "scale": 1},  # 950 XP
        headers=auth_header(poor_student),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_and_delete_placed(
    client: AsyncClient, _seeded_catalog, rich_student
):
    create = await client.post(
        "/api/v1/gamification/room/placed",
        json={"item_id": "bed-basic", "x": 1, "y": 0, "z": 1, "rot": 0, "scale": 1},
        headers=auth_header(rich_student),
    )
    pid = create.json()["placed"][0]["id"]

    upd = await client.patch(
        f"/api/v1/gamification/room/placed/{pid}",
        json={"x": 5.5, "y": 1.0, "z": 6.5, "rot": 45, "scale": 0.5},
        headers=auth_header(rich_student),
    )
    assert upd.status_code == 200
    moved = next(p for p in upd.json()["placed"] if p["id"] == pid)
    assert moved["x"] == 5.5 and moved["scale"] == 0.5 and moved["rot"] == 45

    dele = await client.delete(
        f"/api/v1/gamification/room/placed/{pid}",
        headers=auth_header(rich_student),
    )
    assert dele.status_code == 200
    assert all(p["id"] != pid for p in dele.json()["placed"])


@pytest.mark.asyncio
async def test_first_visit_seeds_default_placed_furniture(
    client: AsyncClient, _seeded_catalog, rich_student
):
    """A brand-new room is auto-furnished: default furniture lands as placed
    instances (not slot equips), while wall/floor stay equips."""
    resp = await client.get(
        "/api/v1/gamification/room/state", headers=auth_header(rich_student)
    )
    placed = resp.json()["placed"]
    ids = {p["item_id"] for p in placed}
    assert "bed-basic" in ids  # default bed is now a placed instance
    assert len(placed) >= 3
    # ...and the bed is NOT in the slot-based equipped map anymore.
    assert "bed" not in resp.json()["equipped"]
    # Imported voxel furniture is part of the default room at tuned positions.
    assert "vox-bookshelf" in ids
    shelf = next(p for p in placed if p["item_id"] == "vox-bookshelf")
    assert shelf["x"] == 1.25 and shelf["z"] == 11.75


@pytest.mark.asyncio
async def test_default_placed_not_reseeded_after_empty(
    client: AsyncClient, _seeded_catalog, rich_student
):
    """Emptying the room must not trigger re-furnishing on the next visit."""
    first = await client.get(
        "/api/v1/gamification/room/state", headers=auth_header(rich_student)
    )
    for p in first.json()["placed"]:
        await client.delete(
            f"/api/v1/gamification/room/placed/{p['id']}",
            headers=auth_header(rich_student),
        )
    again = await client.get(
        "/api/v1/gamification/room/state", headers=auth_header(rich_student)
    )
    assert again.json()["placed"] == []  # stays empty, not re-seeded


@pytest.mark.asyncio
async def test_existing_slot_furniture_migrated_to_placed(
    client: AsyncClient, _seeded_catalog, rich_student, db: AsyncSession
):
    """A pre-existing user with old slot-based furniture gets it converted to a
    placed instance (base + offset) on next load; wall stays an equip."""
    db.add(UserRoomEquip(user_id=rich_student.id, slot="wall", item_id="wall-lavender"))
    db.add(
        UserRoomEquip(user_id=rich_student.id, slot="bed", item_id="bed-basic", offset_dx=2)
    )
    await db.flush()

    body = (
        await client.get(
            "/api/v1/gamification/room/state", headers=auth_header(rich_student)
        )
    ).json()
    assert "bed" not in body["equipped"]  # migrated out of slots
    assert "wall" in body["equipped"]  # setting stays
    beds = [p for p in body["placed"] if p["item_id"] == "bed-basic"]
    assert len(beds) == 1
    assert beds[0]["x"] == 10.5  # base 8.5 + offset_dx 2
