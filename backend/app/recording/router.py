from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
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
    storage_url: str
    duration_seconds: int | None = None
    size_bytes: int | None = None


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

    recording.storage_url = body.storage_url
    recording.duration_seconds = body.duration_seconds
    recording.size_bytes = body.size_bytes
    recording.status = RecordingStatus.ready
    await db.flush()
    return recording


@router.get("", response_model=list[RecordingResponse])
async def list_recordings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Recording).where(Recording.user_id == user.id)
    )
    return result.scalars().all()
