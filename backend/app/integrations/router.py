import re
import uuid
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
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


# ---------------------------------------------------------------------------
# Zoom OAuth Integration
# ---------------------------------------------------------------------------


@router.get("/zoom/authorize")
async def zoom_authorize(user: User = Depends(get_current_user)):
    """Redirect to Zoom OAuth consent screen."""
    if not settings.zoom_client_id:
        raise HTTPException(400, "Zoom integration not configured")

    state = f"{user.org_id}:{user.id}"  # encode org_id + user_id in state
    params = {
        "response_type": "code",
        "client_id": settings.zoom_client_id,
        "redirect_uri": settings.zoom_redirect_uri,
        "state": state,
    }
    url = f"https://zoom.us/oauth/authorize?{urlencode(params)}"
    return RedirectResponse(url)


@router.get("/zoom/callback")
async def zoom_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    """Handle Zoom OAuth callback — exchange code for tokens and save."""
    # Parse state to get org_id and user_id
    org_id_str, user_id_str = state.split(":")
    org_id = uuid.UUID(org_id_str)
    user_id = uuid.UUID(user_id_str)

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://zoom.us/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.zoom_redirect_uri,
            },
            auth=(settings.zoom_client_id, settings.zoom_client_secret),
        )

    if token_resp.status_code != 200:
        # Redirect to admin integrations page with error
        return RedirectResponse("/admin/integrations?error=zoom_auth_failed")

    token_data = token_resp.json()
    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)

    # Get user profile from Zoom
    async with httpx.AsyncClient() as client:
        profile_resp = await client.get(
            "https://api.zoom.us/v2/users/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    account_email = None
    account_name = None
    if profile_resp.status_code == 200:
        profile = profile_resp.json()
        account_email = profile.get("email")
        account_name = (
            f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
        )

    # Upsert OAuthConnection
    existing = await db.execute(
        select(OAuthConnection).where(
            OAuthConnection.org_id == org_id,
            OAuthConnection.provider == IntegrationProvider.zoom,
        )
    )
    conn = existing.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=expires_in)

    if conn:
        conn.access_token = access_token
        conn.refresh_token = refresh_token
        conn.token_expires_at = expires_at
        conn.account_email = account_email
        conn.account_name = account_name
        conn.is_active = True
        conn.connected_by = user_id
    else:
        conn = OAuthConnection(
            org_id=org_id,
            provider=IntegrationProvider.zoom,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=expires_at,
            account_email=account_email,
            account_name=account_name,
            is_active=True,
            connected_by=user_id,
            scopes="meeting:write:meeting,user:read:user",
        )
        db.add(conn)

    await db.commit()

    # Redirect to admin integrations page with success
    return RedirectResponse("/admin/integrations?connected=zoom")


@router.post("/zoom/meetings")
async def create_zoom_meeting(
    title: str,
    start_time: str | None = None,  # ISO 8601
    duration: int = 60,  # minutes
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Zoom meeting using the org's connected Zoom account."""
    # Get the org's Zoom connection
    result = await db.execute(
        select(OAuthConnection).where(
            OAuthConnection.org_id == user.org_id,
            OAuthConnection.provider == IntegrationProvider.zoom,
            OAuthConnection.is_active == True,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(
            400, "Zoom not connected. Go to Admin > Integrations to connect."
        )

    # TODO: refresh token if expired
    # For now, just use the access token

    meeting_data = {
        "topic": title,
        "type": 2,  # scheduled meeting
        "duration": duration,
        "settings": {
            "join_before_host": True,
            "waiting_room": False,
            "auto_recording": "none",
        },
    }
    if start_time:
        meeting_data["start_time"] = start_time
        meeting_data["timezone"] = "UTC"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.zoom.us/v2/users/me/meetings",
            json=meeting_data,
            headers={"Authorization": f"Bearer {conn.access_token}"},
        )

    if resp.status_code == 201:
        data = resp.json()
        return {
            "id": data["id"],
            "join_url": data["join_url"],
            "start_url": data["start_url"],
            "topic": data["topic"],
            "duration": data["duration"],
            "start_time": data.get("start_time"),
        }
    else:
        raise HTTPException(resp.status_code, f"Zoom API error: {resp.text}")
