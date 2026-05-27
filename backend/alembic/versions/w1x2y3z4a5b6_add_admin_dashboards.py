"""add admin_dashboards table

Backs per-user customisable admin analytics dashboards (Sprint A1).

view_scope encodes RBAC at the row level:
  - own_teacher: teacher's personal scope
  - org:         admin org scope
  - global:      super-admin cross-org

Idempotent (IF NOT EXISTS) so re-runs via _run_setup are safe.
"""

from typing import Sequence, Union

import sqlalchemy as sa  # noqa: F401 — kept for Alembic stub compat

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "w1x2y3z4a5b6"
down_revision: Union[str, None] = "v0w1x2y3z4a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS admin_dashboards (
            id           UUID PRIMARY KEY,
            org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name         VARCHAR(120) NOT NULL DEFAULT 'My dashboard',
            is_default   BOOLEAN NOT NULL DEFAULT FALSE,
            view_scope   VARCHAR(20) NOT NULL DEFAULT 'org',
            layout       JSONB NOT NULL DEFAULT '{}'::jsonb,
            filters      JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_admin_dashboards_org
            ON admin_dashboards (org_id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_admin_dashboards_user
            ON admin_dashboards (user_id);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_admin_dashboards_user_scope
            ON admin_dashboards (user_id, view_scope);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS admin_dashboards;")
