"""sites (branches) + room kind/meeting_url/site_id (Phase E1)

Adds the multi-branch + offline/online-room scheduling primitives, **additively
and prod-safe**:

  * ``sites`` — a per-org catalog of branches/campuses (``id, org_id, name,
    timezone, is_active``). Offline-room clash detection is scoped within a
    site; online rooms (``rooms.site_id IS NULL``) form an org-wide pool.
  * ``rooms`` gains ``kind`` ('offline' | 'online', default 'offline'),
    ``meeting_url`` (online only) and ``site_id`` (FK ``sites.id`` ON DELETE SET
    NULL). The legacy free-text ``site`` column is KEPT (never dropped).

Idempotent: ``CREATE TABLE IF NOT EXISTS`` / ``ADD COLUMN IF NOT EXISTS`` so it
is safe to re-run via the ``_run_setup`` boot-time fallback in main.py.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "s1te5e1f2a3"
down_revision: Union[str, None] = "cur1c0lum01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS sites (
            id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id      UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name        VARCHAR(120) NOT NULL,
            timezone    VARCHAR(64)  NOT NULL DEFAULT 'Europe/Berlin',
            is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_sites_org ON sites(org_id)")
    op.execute(
        "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS kind varchar(16) NOT NULL DEFAULT 'offline'"
    )
    op.execute("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS meeting_url varchar(500)")
    op.execute(
        "ALTER TABLE rooms "
        "ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id) ON DELETE SET NULL"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_rooms_site ON rooms(site_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_rooms_site")
    op.execute("ALTER TABLE rooms DROP COLUMN IF EXISTS site_id")
    op.execute("ALTER TABLE rooms DROP COLUMN IF EXISTS meeting_url")
    op.execute("ALTER TABLE rooms DROP COLUMN IF EXISTS kind")
    op.execute("DROP INDEX IF EXISTS ix_sites_org")
    op.execute("DROP TABLE IF EXISTS sites")
