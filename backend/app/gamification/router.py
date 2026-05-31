import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.gamification.schemas import (
    BadgeResponse,
    LeaderboardEntry,
    PlacedCreateRequest,
    PlacedItemResponse,
    PlacedUpdateRequest,
    RoomEquipOffset,
    RoomEquipRequest,
    RoomItemResponse,
    RoomLayoutRequest,
    RoomStateResponse,
    StreakResponse,
)
from app.gamification.service import (
    RoomEquipError,
    add_placed_item,
    delete_placed_item,
    equip_room_item,
    get_leaderboard,
    get_leagues_info,
    get_room_state,
    get_user_badges,
    get_user_streak,
    set_room_layout,
    update_placed_item,
)

router = APIRouter()


@router.get("/my-badges", response_model=list[BadgeResponse])
async def my_badges_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_badges(db, user.id, user.org_id)


@router.get("/my-streak", response_model=StreakResponse)
async def my_streak_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_streak(db, user.id)


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_leaderboard(db, user.org_id)


@router.get("/leagues")
async def leagues_endpoint():
    return await get_leagues_info()


# ─── Room (My Room feature) ─────────────────────────────────────────────


@router.get("/room/state", response_model=RoomStateResponse)
async def room_state_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    state = await get_room_state(db, user.id)
    return RoomStateResponse(
        wallet=state["wallet"],
        equipped={
            slot: RoomEquipOffset(**payload) for slot, payload in state["equipped"].items()
        },
        catalog=[RoomItemResponse.model_validate(item) for item in state["catalog"]],
        placed=[PlacedItemResponse.model_validate(p) for p in state["placed"]],
    )


@router.post("/room/equip", response_model=RoomStateResponse)
async def room_equip_endpoint(
    body: RoomEquipRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await equip_room_item(db, user.id, body.slot, body.item_id)
    except RoomEquipError as exc:
        if exc.code == "item_not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, exc.message) from exc
        if exc.code == "locked":
            raise HTTPException(status.HTTP_403_FORBIDDEN, exc.message) from exc
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, exc.message) from exc
    return await room_state_endpoint(user=user, db=db)


@router.post("/room/layout", response_model=RoomStateResponse)
async def room_layout_endpoint(
    body: RoomLayoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await set_room_layout(
            db,
            user.id,
            body.slot,
            body.offset_dx,
            body.offset_dz,
            body.offset_rot,
            body.offset_dy,
        )
    except RoomEquipError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, exc.message) from exc
    return await room_state_endpoint(user=user, db=db)


# ─── Freeform placed items (room furniture/decor) ───────────────────────


def _placed_error(exc: RoomEquipError) -> HTTPException:
    if exc.code == "item_not_found":
        return HTTPException(status.HTTP_404_NOT_FOUND, exc.message)
    if exc.code == "locked":
        return HTTPException(status.HTTP_403_FORBIDDEN, exc.message)
    return HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, exc.message)


@router.post("/room/placed", response_model=RoomStateResponse)
async def room_place_endpoint(
    body: PlacedCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await add_placed_item(db, user.id, body.item_id, body.x, body.y, body.z, body.rot, body.scale)
    except RoomEquipError as exc:
        raise _placed_error(exc) from exc
    return await room_state_endpoint(user=user, db=db)


@router.patch("/room/placed/{placed_id}", response_model=RoomStateResponse)
async def room_place_update_endpoint(
    placed_id: uuid.UUID,
    body: PlacedUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await update_placed_item(db, user.id, placed_id, body.x, body.y, body.z, body.rot, body.scale)
    except RoomEquipError as exc:
        raise _placed_error(exc) from exc
    return await room_state_endpoint(user=user, db=db)


@router.delete("/room/placed/{placed_id}", response_model=RoomStateResponse)
async def room_place_delete_endpoint(
    placed_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_placed_item(db, user.id, placed_id)
    return await room_state_endpoint(user=user, db=db)
