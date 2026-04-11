import re

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.config import settings
from app.db.session import get_db
from app.integrations.models import IntegrationProvider, OAuthConnection
from app.integrations.schemas import (
    IntegrationStatusResponse,
    OAuthConnectionResponse,
)

router = APIRouter()


@router.get("/status", response_model=IntegrationStatusResponse)
async def get_integration_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all connections and available providers for the current org."""
    result = await db.execute(
        select(OAuthConnection).where(OAuthConnection.org_id == user.org_id)
    )
    connections = result.scalars().all()

    return IntegrationStatusResponse(
        connections=[OAuthConnectionResponse.model_validate(c) for c in connections],
        available_providers=[p.value for p in IntegrationProvider],
    )


@router.delete("/{provider}")
async def disconnect_integration(
    provider: IntegrationProvider,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect an integration by removing the OAuth connection."""
    result = await db.execute(
        delete(OAuthConnection).where(
            OAuthConnection.org_id == user.org_id,
            OAuthConnection.provider == provider,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Integration not found")

    await db.commit()
    return {"detail": f"{provider.value} integration disconnected"}


def _parse_iso8601_duration(iso_duration: str) -> str:
    """Convert ISO 8601 duration (e.g. PT4M30S, PT1H2M10S) to human-readable (4:30, 1:02:10)."""
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso_duration)
    if not match:
        return iso_duration
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


@router.get("/youtube/video/{video_id}")
async def get_youtube_video_metadata(video_id: str):
    """Fetch YouTube video metadata (title, thumbnail, duration, channel)."""
    api_key = settings.youtube_api_key
    if not api_key:
        # Return a minimal fallback so the frontend can still render an embed
        return {
            "id": video_id,
            "title": None,
            "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            "channel": None,
            "duration": None,
            "publishedAt": None,
        }

    url = (
        "https://www.googleapis.com/youtube/v3/videos"
        f"?id={video_id}&part=snippet,contentDetails&key={api_key}"
    )

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"YouTube API returned status {resp.status_code}",
        )

    data = resp.json()
    items = data.get("items", [])
    if not items:
        raise HTTPException(status_code=404, detail="Video not found")

    item = items[0]
    snippet = item.get("snippet", {})
    content_details = item.get("contentDetails", {})

    thumbnails = snippet.get("thumbnails", {})
    thumbnail = (
        thumbnails.get("maxres", {}).get("url")
        or thumbnails.get("high", {}).get("url")
        or thumbnails.get("medium", {}).get("url")
        or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    )

    return {
        "id": item["id"],
        "title": snippet.get("title"),
        "thumbnail": thumbnail,
        "channel": snippet.get("channelTitle"),
        "duration": _parse_iso8601_duration(content_details.get("duration", "")),
        "publishedAt": snippet.get("publishedAt"),
    }
