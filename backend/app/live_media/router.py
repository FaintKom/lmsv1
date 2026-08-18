"""Media endpoints for a live lesson.

Mounted under ``/api/v1/live-lessons``.

Scoping is not re-derived here. ``live_lessons.service.get_lesson_for_user``
already resolves a lesson against the caller's organisation and group, and it is
reused rather than reimplemented: a lesson belonging to another school raises
``ValueError`` and becomes a 404, so its existence stays hidden, while a pupil of
this school who is not in the group gets a 403 — the lesson is no secret from
them, they simply are not in it.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.common.rate_limit import limiter
from app.config import settings
from app.db.session import get_db
from app.live_lessons import realtime
from app.live_lessons import service as lesson_service
from app.live_media import grants, service
from app.live_media.schemas import (
    FloorRequest,
    FloorResponse,
    MediaTokenResponse,
    ModerationResponse,
    ScreenShareRequest,
)

router = APIRouter()


async def _lesson_a_teacher_runs(
    lesson_id: uuid.UUID, user: User, db: AsyncSession
) -> "lesson_service.LiveLesson":
    """Resolve a lesson this caller may moderate.

    Same lookup as everywhere else in the module, so another school's lesson is
    404 and a pupil of this school gets 403 rather than a hint about what they
    are missing.
    """
    try:
        lesson, is_teacher = await lesson_service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    if not is_teacher:
        raise HTTPException(status_code=403, detail="forbidden")
    if lesson.status != "active":
        raise HTTPException(status_code=409, detail="lesson ended")
    return lesson


async def _participant_of(lesson, target_id: uuid.UUID, db: AsyncSession) -> uuid.UUID:
    """Confirm the target belongs to this lesson before acting on them.

    An identifier arriving in a request is never used on trust. Without this a
    teacher could name somebody from another school and the media server would
    happily be told to mute them.
    """
    if target_id == lesson.teacher_id:
        return target_id
    members = await lesson_service.group_member_ids(db, lesson.group_id)
    if target_id not in members:
        raise HTTPException(status_code=404, detail="participant not in this lesson")
    return target_id


@router.post("/{lesson_id}/media/token", response_model=MediaTokenResponse)
@limiter.limit("30/minute")
async def issue_token(
    # `request` is slowapi's requirement, `response` is where it writes the
    # rate-limit headers. Omitting the second one throws at call time rather
    # than at import, so it fails only for callers who got as far as succeeding.
    request: Request,
    response: Response,
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MediaTokenResponse:
    """Sign a short-lived grant for this lesson's room.

    The only endpoint that decides permissions, and it decides them from the
    session cookie the browser already holds. Nothing about the caller's role is
    taken from the request.
    """
    try:
        lesson, is_teacher = await lesson_service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")

    if lesson.status != "active":
        raise HTTPException(status_code=409, detail="lesson ended")

    # Checked before the ceiling, so a removed pupil is told why rather than
    # being told the host is full.
    if await service.is_removed(lesson.id, user.id):
        raise HTTPException(status_code=403, detail="removed from this lesson")

    if not await service.has_capacity_for_one_more():
        # Deliberately not an error to retry blindly. The lesson carries on with
        # its board, tasks and roster; only the video is unavailable, and no
        # existing room is degraded to make space (FR-008).
        raise HTTPException(status_code=503, detail="media unavailable: host at capacity")

    may_share = is_teacher or await service.may_share_screen(lesson.id, user.id)
    room = grants.room_name(lesson.id)

    # The media server does not create rooms on demand, so that a valid grant
    # cannot be used to invent one. Something has to, and this is the only place
    # that has already established the caller belongs here.
    await service.ensure_room(room)

    return MediaTokenResponse(
        url=settings.livekit_public_url,
        token=grants.sign(user, room, is_teacher=is_teacher, may_share_screen=may_share),
        identity=str(user.id),
        room=room,
        can_publish_screen=may_share,
        expires_in=settings.media_grant_ttl_seconds,
    )


@router.post("/{lesson_id}/media/participants/{user_id}/mute", response_model=ModerationResponse)
@limiter.limit("60/minute")
async def mute_participant(
    request: Request,
    response: Response,
    lesson_id: uuid.UUID,
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ModerationResponse:
    """Silence one participant's microphone (FR-011).

    They may unmute themselves again — this quiets a room, it does not gag
    anybody, and the teacher can repeat it (FR-012).
    """
    lesson = await _lesson_a_teacher_runs(lesson_id, user, db)
    target = await _participant_of(lesson, user_id, db)
    applied = await service.mute_microphone(grants.room_name(lesson.id), target)
    return ModerationResponse(applied=applied)


@router.post("/{lesson_id}/media/participants/{user_id}/remove", response_model=ModerationResponse)
@limiter.limit("30/minute")
async def remove_participant(
    request: Request,
    response: Response,
    lesson_id: uuid.UUID,
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ModerationResponse:
    """Remove somebody from the room and keep them out (FR-003)."""
    lesson = await _lesson_a_teacher_runs(lesson_id, user, db)
    target = await _participant_of(lesson, user_id, db)
    applied = await service.eject(lesson.id, target, grants.room_name(lesson.id))
    await realtime.publish(lesson.id, "all", "media_participant_removed", {"user_id": str(target)})
    # `applied` is false when they had not joined yet. They are still on the
    # removed list, so the door stays shut when they try.
    return ModerationResponse(applied=applied)


@router.post("/{lesson_id}/media/floor", response_model=FloorResponse)
@limiter.limit("60/minute")
async def set_floor(
    request: Request,
    response: Response,
    lesson_id: uuid.UUID,
    body: FloorRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FloorResponse:
    """Give one participant the floor, or take it back (FR-013).

    This answers the raised hand pupils already send. There is no second
    hand-raise, and there is no separate endpoint for clearing: clearing is the
    same decision made about nobody.
    """
    lesson = await _lesson_a_teacher_runs(lesson_id, user, db)
    target = await _participant_of(lesson, body.user_id, db) if body.user_id else None
    await service.set_floor(lesson.id, target)
    await realtime.publish(
        lesson.id, "all", "media_floor_changed", {"user_id": str(target) if target else None}
    )
    return FloorResponse(user_id=target)


@router.post(
    "/{lesson_id}/media/participants/{user_id}/screen-share",
    response_model=ModerationResponse,
)
@limiter.limit("60/minute")
async def set_screen_share(
    request: Request,
    response: Response,
    lesson_id: uuid.UUID,
    user_id: uuid.UUID,
    body: ScreenShareRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ModerationResponse:
    """Permit a pupil to share a screen, or withdraw it (FR-014).

    Withdrawing reaches the live participant as well as the next grant, so a
    share already on the class's screens actually stops.
    """
    lesson = await _lesson_a_teacher_runs(lesson_id, user, db)
    target = await _participant_of(lesson, user_id, db)
    applied = await service.set_screen_share(
        lesson.id, target, grants.room_name(lesson.id), allowed=body.allowed
    )
    await realtime.publish(
        lesson.id,
        "all",
        "media_share_grant_changed",
        {"user_id": str(target), "allowed": body.allowed},
    )
    # False when they are not in the room yet: the grant is recorded and takes
    # effect the moment they join.
    return ModerationResponse(applied=applied)
