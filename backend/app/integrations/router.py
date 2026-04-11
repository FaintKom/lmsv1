from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
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
