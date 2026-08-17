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
    expires_in: int
