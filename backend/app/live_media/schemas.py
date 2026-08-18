import uuid

from pydantic import BaseModel


class MediaTokenResponse(BaseModel):
    """Everything a browser needs to join one room, and nothing it may change.

    The permissions are not here. They live inside the signed token, which the
    media server checks and this response cannot influence.
    ``can_publish_screen`` is a hint so the interface knows whether to offer the
    button — hiding a button is not a control, and the grant is what decides.
    """

    url: str
    token: str
    identity: str
    room: str
    can_publish_screen: bool
    # Separate from the line above on purpose: a teacher may hand a pupil the
    # screen, and that pupil must not then be offered a record button the
    # server will refuse. Still only a hint — the server decides both.
    can_record: bool
    expires_in: int


class FloorRequest(BaseModel):
    """Who the class should be looking at, or nobody.

    ``None`` clears it. There is no separate "clear" endpoint because clearing
    is the same decision as setting, made about a different person.
    """

    user_id: uuid.UUID | None = None


class FloorResponse(BaseModel):
    user_id: uuid.UUID | None = None


class ScreenShareRequest(BaseModel):
    allowed: bool


class ModerationResponse(BaseModel):
    """What the action left behind.

    ``applied`` is false when there was nothing to act on — a participant who
    has not joined yet, or one with no microphone published. Not an error: the
    teacher asked for silence and silence is what there is.
    """

    ok: bool = True
    applied: bool = True


class BreakoutCreateRequest(BaseModel):
    """How small the groups should be.

    A size rather than an explicit assignment: a teacher splitting a class says
    "in threes", not "these three, then those three". Naming people can come
    later if anybody asks for it.
    """

    group_size: int = 3


class BreakoutGroupResponse(BaseModel):
    index: int
    member_ids: list[str]


class BreakoutsResponse(BaseModel):
    groups: list[BreakoutGroupResponse]


class BreakoutMessageRequest(BaseModel):
    text: str
