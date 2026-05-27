"""HTTP endpoints for admin-dashboard persistence.

Surface (all under ``/admin/dashboards``):

  - POST   /              create dashboard
  - GET    /              list mine (super_admin: list all)
  - GET    /{id}          fetch one
  - PATCH  /{id}          partial update (incl. flipping default)
  - DELETE /{id}          delete

RBAC + cross-org isolation enforced in ``service.py``; this router is
a thin shim doing authn, schema parsing, and DashboardError → HTTP
translation.

Deliberately NOT using ``from __future__ import annotations`` so
FastAPI / Pydantic 2.9 can resolve response_model classes eagerly when
the decorators fire at import time.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics import service as analytics_service
from app.analytics.models import DashboardScope
from app.analytics.schemas import (
    DashboardCreateRequest,
    DashboardResponse,
    DashboardUpdateRequest,
)
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db

router = APIRouter()


def _translate(exc: analytics_service.DashboardError) -> HTTPException:
    code_to_status = {
        "not_found": status.HTTP_404_NOT_FOUND,
        "forbidden": status.HTTP_403_FORBIDDEN,
        "scope_not_allowed": status.HTTP_403_FORBIDDEN,
        "cross_org": status.HTTP_403_FORBIDDEN,
    }
    http_status = code_to_status.get(exc.code, status.HTTP_400_BAD_REQUEST)
    return HTTPException(
        status_code=http_status,
        detail={"code": exc.code, "message": exc.message},
    )


@router.post(
    "/admin/dashboards",
    response_model=DashboardResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_dashboard_endpoint(
    body: DashboardCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    try:
        row = await analytics_service.create_dashboard(db, user, body)
    except analytics_service.DashboardError as exc:
        raise _translate(exc) from exc
    return DashboardResponse.model_validate(row)


@router.get("/admin/dashboards", response_model=list[DashboardResponse])
async def list_dashboards_endpoint(
    scope: DashboardScope | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DashboardResponse]:
    try:
        rows = await analytics_service.list_dashboards(db, user, scope=scope)
    except analytics_service.DashboardError as exc:
        raise _translate(exc) from exc
    return [DashboardResponse.model_validate(r) for r in rows]


@router.get("/admin/dashboards/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard_endpoint(
    dashboard_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    try:
        row = await analytics_service.get_dashboard(db, user, dashboard_id)
    except analytics_service.DashboardError as exc:
        raise _translate(exc) from exc
    return DashboardResponse.model_validate(row)


@router.patch("/admin/dashboards/{dashboard_id}", response_model=DashboardResponse)
async def update_dashboard_endpoint(
    dashboard_id: uuid.UUID,
    body: DashboardUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    try:
        row = await analytics_service.update_dashboard(db, user, dashboard_id, body)
    except analytics_service.DashboardError as exc:
        raise _translate(exc) from exc
    return DashboardResponse.model_validate(row)


@router.delete(
    "/admin/dashboards/{dashboard_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_dashboard_endpoint(
    dashboard_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await analytics_service.delete_dashboard(db, user, dashboard_id)
    except analytics_service.DashboardError as exc:
        raise _translate(exc) from exc
