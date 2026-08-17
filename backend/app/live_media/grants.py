"""The one place a participant's permissions are decided.

Every grant this feature issues is built here, and nothing outside this module
may assemble one. That is the point of the module: on the free public Jitsi
instance the moderator was whoever entered the room first, so a teacher could
not mute a microphone or remove anybody. Here the server decides, signs it, and
the media server enforces it. A client asking for more is refused by the media
server rather than by a hidden button.

Room names are derived from the lesson id and never accepted from a request, so
there is no name for a caller to guess and no room to reach by knowing one.
"""

import uuid
from datetime import timedelta

from livekit.api import AccessToken, VideoGrants

from app.auth.models import User
from app.config import settings

# What a participant may publish. A pupil gets the two devices they own; screen
# sharing is a teacher's to give and to take back (FR-014).
PUPIL_SOURCES = ["camera", "microphone"]
TEACHER_SOURCES = ["camera", "microphone", "screen_share", "screen_share_audio"]


def room_name(lesson_id: uuid.UUID) -> str:
    """The media room belonging to one live lesson."""
    return f"lesson-{lesson_id}"


def breakout_room_name(lesson_id: uuid.UUID, index: int) -> str:
    """The media room belonging to one breakout group of a lesson."""
    return f"lesson-{lesson_id}-b{index}"


def build_grants(room: str, *, is_teacher: bool, may_share_screen: bool) -> VideoGrants:
    """Permissions for one person in one room.

    ``room_admin`` is the difference between a teacher and everybody else: it is
    what lets the server-side moderation calls act on other participants, and a
    pupil never carries it.
    """
    sources = list(TEACHER_SOURCES) if is_teacher else list(PUPIL_SOURCES)
    if not is_teacher and may_share_screen:
        sources += ["screen_share", "screen_share_audio"]

    return VideoGrants(
        room_join=True,
        room=room,
        room_admin=is_teacher,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True,
        can_publish_sources=sources,
        # A participant renaming themselves mid-lesson would break the
        # correspondence between the tiles and the roster beside them, which is
        # the whole reason the media sits on that page.
        can_update_own_metadata=False,
    )


def sign(
    user: User,
    room: str,
    *,
    is_teacher: bool,
    may_share_screen: bool = False,
) -> str:
    """Mint a short-lived ticket to join one room.

    The lifetime is short on purpose. A grant is a ticket to enter, not a
    session: the media server checks it once at the door and the connection
    outlives it. A long-lived token outlives a teacher's decision to remove
    somebody, and lets that person walk straight back in (FR-003).
    """
    display_name = (user.full_name or "").strip() or user.email

    return (
        AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(str(user.id))
        .with_name(display_name)
        .with_grants(build_grants(room, is_teacher=is_teacher, may_share_screen=may_share_screen))
        .with_ttl(timedelta(seconds=settings.media_grant_ttl_seconds))
        .to_jwt()
    )
