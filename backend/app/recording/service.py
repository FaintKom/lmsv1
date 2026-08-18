"""Storing a recording, and letting go of it again.

The module this joins was a stub: ``/init`` handed out an upload URL for a route
that did not exist, and ``/complete`` wrote whatever location the caller sent.
Both are fixed here, alongside the two housekeeping jobs the feature needs.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Organization
from app.common.storage import get_storage
from app.recording.models import Recording, RecordingStatus

# How long a recording may sit half-uploaded before it is called failed. Long
# enough for a slow connection carrying a lesson-length file, short enough that
# nobody is still watching "uploading" the next morning.
STALE_UPLOAD_HOURS = 4

DEFAULT_RETENTION_DAYS = 30


def _org_setting(org: Organization | None, key: str, fallback):
    return (org.settings or {}).get(key, fallback) if org is not None else fallback


def recording_enabled(org: Organization | None) -> bool:
    """Whether this school has switched recording on.

    False unless somebody deliberately said otherwise. The subject is a room
    full of children, and a default that records them is not one to inherit by
    accident (FR-019).
    """
    return bool(_org_setting(org, "recording_enabled", False))


def retention_days(org: Organization | None) -> int:
    return int(_org_setting(org, "recording_retention_days", DEFAULT_RETENTION_DAYS))


def storage_path(recording: Recording) -> str:
    """Where the bytes go. Derived, never accepted from a caller.

    Keyed by organisation so one school's recordings are not interleaved with
    another's on disk, which matters on the day somebody has to go and look.
    """
    return f"recordings/{recording.org_id}/{recording.id}.webm"


def store_upload(recording: Recording, data: bytes, content_type: str | None) -> str:
    """Write the file and return the handle the storage backend gives back."""
    return get_storage().write(storage_path(recording), data, content_type)


async def sweep_stale_uploads(db: AsyncSession) -> int:
    """Mark long-abandoned uploads as failed (FR-022).

    A teacher's browser can die mid-recording. Without this the row sits at
    ``uploading`` forever and the interface promises a file that is never
    coming, which is worse than admitting it failed.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=STALE_UPLOAD_HOURS)
    rows = await db.execute(
        select(Recording).where(
            Recording.status == RecordingStatus.uploading,
            Recording.created_at < cutoff,
        )
    )
    swept = 0
    for recording in rows.scalars().all():
        recording.status = RecordingStatus.failed
        swept += 1
    await db.flush()
    return swept


async def purge_expired(db: AsyncSession) -> int:
    """Delete recordings past their retention, bytes and row together (FR-023).

    The bytes go first. A row without its file is a broken link; a file without
    its row is invisible and occupies the disk anyway, and this host has twelve
    gigabytes free.
    """
    now = datetime.now(timezone.utc)
    rows = await db.execute(
        select(Recording).where(Recording.expires_at.is_not(None), Recording.expires_at < now)
    )
    purged = 0
    storage = get_storage()
    for recording in rows.scalars().all():
        if recording.storage_url:
            try:
                storage.delete(storage_path(recording))
            except Exception:  # noqa: BLE001 — a missing file must not block the row
                pass
        await db.delete(recording)
        purged += 1
    await db.flush()
    return purged


async def org_of(db: AsyncSession, org_id: uuid.UUID) -> Organization | None:
    return await db.scalar(select(Organization).where(Organization.id == org_id))
