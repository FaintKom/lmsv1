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
from app.live_lessons import service as lesson_service
from app.live_media import grants, service
from app.live_media.schemas import MediaTokenResponse

router = APIRouter()


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
