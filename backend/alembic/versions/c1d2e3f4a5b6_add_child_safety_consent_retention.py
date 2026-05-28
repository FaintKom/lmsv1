"""add child-safety consent + retention columns to users

Revision ID: c1d2e3f4a5b6
Revises: d0n4t10n5add
Create Date: 2026-05-28

Adds three nullable columns to `users` for the child-safety work:
  - parental_consent_at   — when school-mediated parental consent was attested
  - parental_consent_by   — staff user who attested (FK users.id, SET NULL)
  - last_active_at        — bumped on login/refresh; drives the retention purge

Written rerun-safe (ADD COLUMN IF NOT EXISTS) because `_run_setup` in
`app/main.py` re-applies the same ALTERs on every boot as a fallback.
"""
from typing import Union

from alembic import op


revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "d0n4t10n5add"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS parental_consent_at TIMESTAMPTZ;"
    )
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS parental_consent_by UUID;"
    )
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;"
    )
    op.execute(
        "DO $$ BEGIN "
        "  ALTER TABLE users ADD CONSTRAINT users_parental_consent_by_fkey "
        "  FOREIGN KEY (parental_consent_by) REFERENCES users (id) ON DELETE SET NULL; "
        "EXCEPTION WHEN duplicate_object THEN null; "
        "END $$;"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_parental_consent_by_fkey;"
    )
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS last_active_at;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS parental_consent_by;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS parental_consent_at;")
