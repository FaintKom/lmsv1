"""Admin dashboard persistence.

A "dashboard" is one user's customised view of the analytics page:
the widget layout (positions + sizes via react-grid-layout) and the
filter bar state (date range, course/teacher selectors, org override
for super_admin).

view_scope encodes RBAC at the row level so we can show or hide a
saved dashboard depending on who owns it:

  - ``own_teacher`` — teacher's personal dashboard, scoped to their
    own courses.
  - ``org``         — admin dashboard, free pick within their org.
  - ``global``      — super-admin cross-org dashboard, may select org.

Org membership is enforced by the FK + service-layer org check, so
this enum is purely for UI cues + future "share with org" feature.
"""
from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class DashboardScope(str, enum.Enum):
    own_teacher = "own_teacher"
    org = "org"
    global_ = "global"


class AdminDashboard(Base, IDMixin, TimestampMixin):
    __tablename__ = "admin_dashboards"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False, default="My dashboard")
    is_default: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    # "own_teacher" / "org" / "global"
    view_scope: Mapped[str] = mapped_column(
        String(20), nullable=False, default=DashboardScope.org.value
    )

    # react-grid-layout payload: {widgets: [{id, x, y, w, h, props}]}
    layout: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Filter bar state: {range, course_ids, teacher_id, org_id_override}
    filters: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
