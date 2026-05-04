import re
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.auth.security import decode_token
from app.config import settings
from app.db.session import get_db
from app.integrations.models import IntegrationProvider, OAuthConnection
from app.integrations.schemas import (
    IntegrationStatusResponse,
    OAuthConnectionResponse,
)

router = APIRouter()


async def _get_user_for_oauth_init(
    request: Request,
    token: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """OAuth-init runs as a top-level browser navigation, so the
    Authorization header is dropped on cross-origin redirect. The frontend
    appends `?token=<jwt>` to the authorize URL; this dep reads either the
    Authorization header (preferred) or the `?token=` query param.
    """
    raw: str | None = None
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        raw = auth_header.split(" ", 1)[1].strip()
    if not raw and token:
        raw = token.strip()

    if not raw:
        raise HTTPException(401, "Authentication required")

    payload = decode_token(raw)
    if not payload or payload.get("type") != "access":
        raise HTTPException(401, "Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(401, "Invalid token payload")

    try:
        uid = uuid.UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(401, "Invalid token payload")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or inactive")

    return user


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
async def zoom_authorize(user: User = Depends(_get_user_for_oauth_init)):
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


# ---------------------------------------------------------------------------
# Google OAuth Integration (Meet, Drive, Classroom)
# ---------------------------------------------------------------------------

_GOOGLE_SCOPES = {
    "google_meet": "openid email profile https://www.googleapis.com/auth/calendar.events",
    "google_drive": "openid email profile https://www.googleapis.com/auth/drive.file",
    "google_classroom": (
        "openid email profile"
        " https://www.googleapis.com/auth/classroom.courses.readonly"
        " https://www.googleapis.com/auth/classroom.rosters.readonly"
        " https://www.googleapis.com/auth/classroom.coursework.students"
    ),
}

_GOOGLE_PROVIDER_MAP = {
    "google_meet": IntegrationProvider.google_meet,
    "google_drive": IntegrationProvider.google_drive,
    "google_classroom": IntegrationProvider.google_classroom,
}


async def _refresh_google_token(conn: OAuthConnection, db: AsyncSession) -> str:
    """Refresh Google OAuth token if expired, return valid access_token."""
    if conn.token_expires_at and conn.token_expires_at > datetime.now(timezone.utc):
        return conn.access_token  # still valid

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": conn.refresh_token,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
            },
        )
    if resp.status_code != 200:
        raise HTTPException(401, "Google token refresh failed. Please reconnect.")

    data = resp.json()
    conn.access_token = data["access_token"]
    conn.token_expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=data.get("expires_in", 3600)
    )
    await db.commit()
    return conn.access_token


@router.get("/google/authorize")
async def google_authorize(
    provider: str = Query("google_meet"),
    user: User = Depends(_get_user_for_oauth_init),
):
    """Redirect to Google OAuth consent screen."""
    if not settings.google_client_id:
        raise HTTPException(400, "Google integration not configured")

    if provider not in _GOOGLE_SCOPES:
        raise HTTPException(400, f"Unknown Google provider: {provider}")

    state = f"{user.org_id}:{user.id}:{provider}"
    params = {
        "response_type": "code",
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "scope": _GOOGLE_SCOPES[provider],
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(
    code: str, state: str, db: AsyncSession = Depends(get_db)
):
    """Handle Google OAuth callback — exchange code for tokens and save."""
    parts = state.split(":")
    if len(parts) != 3:
        return RedirectResponse("/admin/integrations?error=google_invalid_state")

    org_id_str, user_id_str, provider_str = parts
    org_id = uuid.UUID(org_id_str)
    user_id = uuid.UUID(user_id_str)

    provider_enum = _GOOGLE_PROVIDER_MAP.get(provider_str)
    if provider_enum is None:
        return RedirectResponse("/admin/integrations?error=google_unknown_provider")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.google_redirect_uri,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
            },
        )

    if token_resp.status_code != 200:
        return RedirectResponse("/admin/integrations?error=google_auth_failed")

    token_data = token_resp.json()
    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)

    # Get user profile from Google
    async with httpx.AsyncClient() as client:
        profile_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    account_email = None
    account_name = None
    if profile_resp.status_code == 200:
        profile = profile_resp.json()
        account_email = profile.get("email")
        account_name = profile.get("name")

    # Upsert OAuthConnection
    existing = await db.execute(
        select(OAuthConnection).where(
            OAuthConnection.org_id == org_id,
            OAuthConnection.provider == provider_enum,
        )
    )
    conn = existing.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=expires_in)

    if conn:
        conn.access_token = access_token
        conn.refresh_token = refresh_token or conn.refresh_token
        conn.token_expires_at = expires_at
        conn.account_email = account_email
        conn.account_name = account_name
        conn.scopes = _GOOGLE_SCOPES[provider_str]
        conn.is_active = True
        conn.connected_by = user_id
    else:
        conn = OAuthConnection(
            org_id=org_id,
            provider=provider_enum,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=expires_at,
            account_email=account_email,
            account_name=account_name,
            scopes=_GOOGLE_SCOPES[provider_str],
            is_active=True,
            connected_by=user_id,
        )
        db.add(conn)

    await db.commit()
    return RedirectResponse(f"/admin/integrations?connected={provider_str}")


@router.post("/google/meet")
async def create_google_meet(
    title: str,
    start_time: str,
    duration: int = 60,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Google Meet meeting via Google Calendar event."""
    result = await db.execute(
        select(OAuthConnection).where(
            OAuthConnection.org_id == user.org_id,
            OAuthConnection.provider == IntegrationProvider.google_meet,
            OAuthConnection.is_active == True,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(
            400, "Google Meet not connected. Go to Admin > Integrations to connect."
        )

    access_token = await _refresh_google_token(conn, db)

    # Parse start_time and compute end_time
    start_dt = datetime.fromisoformat(start_time)
    end_dt = start_dt + timedelta(minutes=duration)

    event_body = {
        "summary": title,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": "UTC"},
        "conferenceData": {
            "createRequest": {
                "requestId": str(uuid.uuid4()),
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events"
            "?conferenceDataVersion=1",
            json=event_body,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(resp.status_code, f"Google Calendar API error: {resp.text}")

    data = resp.json()
    meet_link = (
        data.get("conferenceData", {})
        .get("entryPoints", [{}])[0]
        .get("uri")
    )
    return {
        "id": data["id"],
        "meet_link": meet_link,
        "calendar_event_id": data["id"],
        "title": data.get("summary"),
        "start_time": data.get("start", {}).get("dateTime"),
    }


@router.get("/google/drive/files")
async def list_google_drive_files(
    q: str = "",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List files from the org's connected Google Drive."""
    result = await db.execute(
        select(OAuthConnection).where(
            OAuthConnection.org_id == user.org_id,
            OAuthConnection.provider == IntegrationProvider.google_drive,
            OAuthConnection.is_active == True,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(
            400, "Google Drive not connected. Go to Admin > Integrations to connect."
        )

    access_token = await _refresh_google_token(conn, db)

    params = {"fields": "files(id,name,mimeType,thumbnailLink,webViewLink)"}
    if q:
        params["q"] = q

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/drive/v3/files",
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Google Drive API error: {resp.text}")

    return resp.json().get("files", [])
