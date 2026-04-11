import uuid
from datetime import datetime

from pydantic import BaseModel

from app.integrations.models import IntegrationProvider


class OAuthConnectionResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    provider: IntegrationProvider
    is_active: bool
    account_email: str | None = None
    account_name: str | None = None
    scopes: str | None = None
    connected_by: uuid.UUID | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class IntegrationStatusResponse(BaseModel):
    """Summary of all integrations for an organization."""

    connections: list[OAuthConnectionResponse]
    available_providers: list[str]
