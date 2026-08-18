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
    BreakoutCreateRequest,
    BreakoutGroupResponse,
    BreakoutMessageRequest,
    BreakoutsResponse,
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
        can_record=is_teacher,
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
    # Told, not merely silenced (FR-012). A microphone that goes quiet with no
    # explanation is indistinguishable from a broken one, and the pupil's next
    # move is to interrupt the lesson asking whether anybody can hear them.
    await realtime.publish(
        lesson.id, "all", "media_muted", {"user_id": str(target), "applied": applied}
    )
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


@router.post("/{lesson_id}/media/breakouts", response_model=BreakoutsResponse)
@limiter.limit("30/minute")
async def create_breakouts(
    request: Request,
    response: Response,
    lesson_id: uuid.UUID,
    body: BreakoutCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BreakoutsResponse:
    """Split the class into small rooms (FR-015).

    Cheaper for the host than the plenary, not dearer: subscriptions scale with
    the square of a room's population, so five threes cost a seventh of one
    fifteen.
    """
    lesson = await _lesson_a_teacher_runs(lesson_id, user, db)
    members = await lesson_service.group_member_ids(db, lesson.group_id)
    rows = await service.create_breakouts(db, lesson, members, body.group_size)

    groups = [BreakoutGroupResponse(index=r.index, member_ids=r.member_ids) for r in rows]
    await realtime.publish(
        lesson.id, "all", "media_breakouts_changed", {"groups": [g.model_dump() for g in groups]}
    )
    return BreakoutsResponse(groups=groups)


@router.get("/{lesson_id}/media/breakouts", response_model=BreakoutsResponse)
async def list_breakouts(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BreakoutsResponse:
    """Who is in which group. Readable by any participant: a pupil needs to
    know where they are going, and the grouping is no secret from the class."""
    try:
        lesson, _ = await lesson_service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")

    rows = await service.list_breakouts(db, lesson)
    return BreakoutsResponse(
        groups=[BreakoutGroupResponse(index=r.index, member_ids=r.member_ids) for r in rows]
    )


@router.delete("/{lesson_id}/media/breakouts", response_model=BreakoutsResponse)
@limiter.limit("30/minute")
async def gather_breakouts(
    request: Request,
    response: Response,
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BreakoutsResponse:
    """Bring everybody back to the main room (FR-016)."""
    lesson = await _lesson_a_teacher_runs(lesson_id, user, db)
    await service.delete_breakouts(db, lesson)
    await realtime.publish(lesson.id, "all", "media_breakouts_changed", {"groups": []})
    return BreakoutsResponse(groups=[])


@router.post("/{lesson_id}/media/breakouts/broadcast", response_model=ModerationResponse)
@limiter.limit("30/minute")
async def broadcast_to_breakouts(
    request: Request,
    response: Response,
    lesson_id: uuid.UUID,
    body: BreakoutMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ModerationResponse:
    """One message to every group at once (FR-016).

    Rides the lesson's existing stream, so a pupil in a breakout receives it
    without a second connection to keep alive.
    """
    lesson = await _lesson_a_teacher_runs(lesson_id, user, db)
    await realtime.publish(lesson.id, "all", "media_breakout_message", {"text": body.text})
    return ModerationResponse()


@router.post("/{lesson_id}/media/token/breakout/{index}", response_model=MediaTokenResponse)
@limiter.limit("30/minute")
async def issue_breakout_token(
    request: Request,
    response: Response,
    lesson_id: uuid.UUID,
    index: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MediaTokenResponse:
    """A grant for one breakout room.

    Authority is whatever it is in the main room (FR-017): a smaller room is
    not a promotion, and splitting a class must not hand a pupil the controls
    just because fewer people are watching.
    """
    try:
        lesson, is_teacher = await lesson_service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")

    if lesson.status != "active":
        raise HTTPException(status_code=409, detail="lesson ended")
    if await service.is_removed(lesson.id, user.id):
        raise HTTPException(status_code=403, detail="removed from this lesson")

    rows = {r.index: r for r in await service.list_breakouts(db, lesson)}
    row = rows.get(index)
    # A group they are not in does not exist as far as they are concerned. The
    # teacher may enter any of them, which is how they visit.
    if row is None or (not is_teacher and str(user.id) not in row.member_ids):
        raise HTTPException(status_code=404, detail="breakout not found")

    if not await service.has_capacity_for_one_more():
        raise HTTPException(status_code=503, detail="media unavailable: host at capacity")

    may_share = is_teacher or await service.may_share_screen(lesson.id, user.id)
    room = grants.breakout_room_name(lesson.id, index)
    await service.ensure_room(room)

    return MediaTokenResponse(
        url=settings.livekit_public_url,
        token=grants.sign(user, room, is_teacher=is_teacher, may_share_screen=may_share),
        identity=str(user.id),
        room=room,
        can_publish_screen=may_share,
        can_record=is_teacher,
        expires_in=settings.media_grant_ttl_seconds,
    )


@router.post("/{lesson_id}/media/recording", status_code=201)
@limiter.limit("20/minute")
async def start_recording(
    request: Request,
    response: Response,
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Begin recording this lesson (FR-019, FR-020).

    Refused unless the school has turned recording on. What gets captured is
    fixed by FR-027 and decided in the browser: the teacher's microphone,
    camera and screen share, and nobody else's. There is no parameter for it,
    so no request can widen it.
    """
    from app.recording import service as rec_service
    from app.recording.models import Recording, RecordingStatus, RecordingType

    lesson = await _lesson_a_teacher_runs(lesson_id, user, db)

    org = await rec_service.org_of(db, user.org_id)
    if not rec_service.recording_enabled(org):
        raise HTTPException(status_code=403, detail="recording is not enabled for this school")

    recording = Recording(
        user_id=user.id,
        org_id=user.org_id,
        type=RecordingType.video,
        status=RecordingStatus.uploading,
        live_lesson_id=lesson.id,
    )
    db.add(recording)
    await db.flush()

    # Remembered rather than only announced: somebody joining later has to be
    # able to find out, and an event they missed cannot tell them (FR-020).
    await realtime.get_redis().set(service.recording_key(lesson.id), str(recording.id))
    await realtime.publish(
        lesson.id, "all", "media_recording_started", {"recording_id": str(recording.id)}
    )
    return {
        "recording_id": str(recording.id),
        "upload_url": f"/api/v1/recordings/{recording.id}/upload",
    }


@router.get("/{lesson_id}/media/recording")
async def recording_state(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Whether this lesson is being recorded right now.

    Read on joining, so a participant who arrives mid-recording sees the
    indicator too. Any participant may ask: being recorded without being told
    is the situation this whole flag exists to prevent.
    """
    try:
        lesson, _ = await lesson_service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")

    current = await realtime.get_redis().get(service.recording_key(lesson.id))
    return {"recording": current is not None, "recording_id": current}


@router.post("/{lesson_id}/media/recording/stop")
@limiter.limit("20/minute")
async def stop_recording(
    request: Request,
    response: Response,
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Stop recording. The file itself arrives separately, by upload."""
    lesson = await _lesson_a_teacher_runs(lesson_id, user, db)

    r = realtime.get_redis()
    current = await r.get(service.recording_key(lesson.id))
    await r.delete(service.recording_key(lesson.id))
    await realtime.publish(lesson.id, "all", "media_recording_stopped", {"recording_id": current})
    return {"recording_id": current}
