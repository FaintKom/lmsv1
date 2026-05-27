"""Pydantic schemas for the admin-dashboard persistence module.

Layout + filters arrive as opaque JSONB. Validators enforce just the
top-level shape we depend on server-side; per-widget config stays
client-owned so adding a new widget type doesn't require a migration.
"""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.analytics.models import DashboardScope

# Hard caps to keep payloads sane (and stop a malicious client from
# stuffing the column with megabytes of JSON).
MAX_WIDGETS = 40
MAX_LAYOUT_BYTES = 32_000
MAX_FILTERS_BYTES = 4_000


class DashboardCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    view_scope: DashboardScope = DashboardScope.org
    is_default: bool = False
    layout: dict[str, Any] = Field(default_factory=dict)
    filters: dict[str, Any] = Field(default_factory=dict)

    @field_validator("layout")
    @classmethod
    def _check_layout(cls, v: dict[str, Any]) -> dict[str, Any]:
        widgets = v.get("widgets")
        if widgets is not None:
            if not isinstance(widgets, list):
                raise ValueError("layout.widgets must be a list")
            if len(widgets) > MAX_WIDGETS:
                raise ValueError(f"too many widgets (max {MAX_WIDGETS})")
            for w in widgets:
                if not isinstance(w, dict):
                    raise ValueError("each widget must be an object")
                if "id" not in w:
                    raise ValueError("widget missing 'id'")
        if len(str(v)) > MAX_LAYOUT_BYTES:
            raise ValueError("layout payload too large")
        return v

    @field_validator("filters")
    @classmethod
    def _check_filters(cls, v: dict[str, Any]) -> dict[str, Any]:
        if len(str(v)) > MAX_FILTERS_BYTES:
            raise ValueError("filters payload too large")
        return v


class DashboardUpdateRequest(BaseModel):
    """Partial update — only the fields supplied are touched."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    view_scope: DashboardScope | None = None
    is_default: bool | None = None
    layout: dict[str, Any] | None = None
    filters: dict[str, Any] | None = None

    @field_validator("layout")
    @classmethod
    def _check_layout(cls, v: dict[str, Any] | None) -> dict[str, Any] | None:
        if v is None:
            return v
        return DashboardCreateRequest._check_layout(v)  # type: ignore[arg-type]

    @field_validator("filters")
    @classmethod
    def _check_filters(cls, v: dict[str, Any] | None) -> dict[str, Any] | None:
        if v is None:
            return v
        return DashboardCreateRequest._check_filters(v)  # type: ignore[arg-type]


class DashboardResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    user_id: uuid.UUID
    name: str
    is_default: bool
    view_scope: DashboardScope
    layout: dict[str, Any]
    filters: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
