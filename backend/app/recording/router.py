from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User, UserRole
from app.config import settings
from app.db.session import get_db
from app.recording import service as rec_service
from app.recording.models import Recording, RecordingStatus, RecordingType

router = APIRouter()


class RecordingInitRequest(BaseModel):
    type: RecordingType


class RecordingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    org_id: uuid.UUID
    type: str
    storage_url: str | None
    duration_seconds: int | None
    size_bytes: int | None
    status: str

    model_config = {"from_attributes": True}


class RecordingInitResponse(BaseModel):
    recording: RecordingResponse
    upload_url: str
    instructions: str


class RecordingCompleteRequest(BaseModel):
    """What the client knows and the server does not.

    ``storage_url`` used to be here. The server writes the file, so the server
    knows where it went; taking the location from the caller meant a row could
    be pointed at anything, and that value later becomes a link somebody
    follows.
    """

    duration_seconds: int | None = None
    size_bytes: int | None = None


class RecordingShareRequest(BaseModel):
    shared_with_group: bool


@router.post("/init", response_model=RecordingInitResponse, status_code=status.HTTP_201_CREATED)
async def init_recording(
    body: RecordingInitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    recording = Recording(
        user_id=user.id,
        org_id=user.org_id,
        type=body.type,
        status=RecordingStatus.uploading,
    )
    db.add(recording)
    await db.flush()

    # Return a placeholder upload URL — real implementation would generate a
    # pre-signed S3/R2 URL here using the storage backend settings.
    upload_url = f"/api/v1/recordings/{recording.id}/upload"
    return RecordingInitResponse(
        recording=RecordingResponse(
            id=recording.id,
            user_id=recording.user_id,
            org_id=recording.org_id,
            type=recording.type,
            storage_url=recording.storage_url,
            duration_seconds=recording.duration_seconds,
            size_bytes=recording.size_bytes,
            status=recording.status,
        ),
        upload_url=upload_url,
        instructions="PUT your file to the upload_url with the correct Content-Type header.",
    )


@router.post("/{recording_id}/complete", response_model=RecordingResponse)
async def complete_recording(
    recording_id: uuid.UUID,
    body: RecordingCompleteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Recording).where(
            Recording.id == recording_id,
            Recording.user_id == user.id,
        )
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")

    recording.duration_seconds = body.duration_seconds
    recording.size_bytes = body.size_bytes
    if not recording.storage_url:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="nothing was uploaded for this recording",
        )
    recording.status = RecordingStatus.ready

    org = await rec_service.org_of(db, recording.org_id)
    recording.expires_at = datetime.now(timezone.utc) + timedelta(
        days=rec_service.retention_days(org)
    )
    await db.flush()
    return recording


@router.put("/{recording_id}/upload", response_model=RecordingResponse)
async def upload_recording(
    recording_id: uuid.UUID,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept the captured file.

    The route `/init` has been advertising since it was written, and which did
    not exist: anything following the API's own instructions got a 404.

    Only the recording's own creator may upload to it, and only while it is
    still expecting a file. Where the bytes land is the server's decision.
    """
    result = await db.execute(
        select(Recording).where(
            Recording.id == recording_id,
            Recording.user_id == user.id,
            Recording.org_id == user.org_id,
        )
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
    if recording.status != RecordingStatus.uploading:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="this recording is already finished"
        )

    # Read in chunks and stop at the limit rather than buffering whatever
    # arrives and measuring afterwards. The point of a cap is that the host
    # never has to hold the thing being refused.
    limit = rec_service.max_upload_bytes()
    chunks: list[bytes] = []
    total = 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > limit:
            # Deliberately not marked failed here. `get_db` rolls the session
            # back on any exception, so the write would vanish and the comment
            # claiming otherwise would be the only trace of it. Left at
            # `uploading`, which also keeps a retry possible; the hourly sweep
            # closes it out if nobody comes back.
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"recording is larger than {settings.max_recording_upload_mb} MB",
            )
        chunks.append(chunk)

    data = b"".join(chunks)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty upload")

    # Postgres shares this disk. A recording is worth less than the school
    # being able to log in tomorrow.
    if not rec_service.room_for(len(data)):
        raise HTTPException(
            status_code=status.HTTP_507_INSUFFICIENT_STORAGE,
            detail="not enough disk space to store this recording",
        )

    recording.storage_url = rec_service.store_upload(
        recording, data, request.headers.get("content-type")
    )
    recording.size_bytes = len(data)
    await db.flush()
    return recording


@router.patch("/{recording_id}", response_model=RecordingResponse)
async def share_recording(
    recording_id: uuid.UUID,
    body: RecordingShareRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Give a recording to the lesson's group, or take it back (FR-021).

    Staff-only until somebody deliberately shares it. Another school's
    recording reads as absent rather than forbidden.
    """
    if user.role not in (UserRole.teacher, UserRole.admin, UserRole.super_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    result = await db.execute(
        select(Recording).where(
            Recording.id == recording_id,
            Recording.org_id == user.org_id,
        )
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")

    recording.shared_with_group = body.shared_with_group
    await db.flush()
    return recording


@router.get("", response_model=list[RecordingResponse])
async def list_recordings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Staff see their school's recordings; a pupil sees their own, plus any a
    # teacher deliberately shared with the group. Every branch is scoped by
    # organisation — the old query filtered on user_id alone, which happened to
    # be safe only because it never showed anybody else's.
    query = select(Recording).where(Recording.org_id == user.org_id)
    if user.role in (UserRole.teacher, UserRole.admin, UserRole.super_admin):
        result = await db.execute(query)
    else:
        result = await db.execute(
            query.where(or_(Recording.user_id == user.id, Recording.shared_with_group.is_(True)))
        )
    return result.scalars().all()
