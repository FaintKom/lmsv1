"""add donations module

Revision ID: d0n4t10n5add
Revises: w1x2y3z4a5b6
Create Date: 2026-05-27

Creates the `donations` table and its two enum types. Written
rerun-safe (IF NOT EXISTS / DO BEGIN ... EXCEPTION) because
`_run_setup` in `app/main.py` also runs `Base.metadata.create_all` on
every boot and could race with this migration.
"""
from typing import Union

from alembic import op


revision: str = "d0n4t10n5add"
down_revision: Union[str, None] = "w1x2y3z4a5b6"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "  CREATE TYPE donation_recurrence AS ENUM ('one_time', 'monthly'); "
        "EXCEPTION WHEN duplicate_object THEN null; "
        "END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "  CREATE TYPE donation_status AS ENUM ('pending', 'confirmed', 'failed'); "
        "EXCEPTION WHEN duplicate_object THEN null; "
        "END $$;"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS donations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            oc_order_id VARCHAR(64) UNIQUE,
            amount_cents INTEGER NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'USD',
            recurrence donation_recurrence NOT NULL DEFAULT 'one_time',
            donor_name VARCHAR(120),
            donor_email VARCHAR(255),
            message TEXT,
            anonymous BOOLEAN NOT NULL DEFAULT FALSE,
            status donation_status NOT NULL DEFAULT 'pending',
            confirmed_at TIMESTAMPTZ,
            raw_webhook JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_donations_status ON donations (status);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_donations_oc_order_id ON donations (oc_order_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS donations;")
    op.execute("DROP TYPE IF EXISTS donation_status;")
    op.execute("DROP TYPE IF EXISTS donation_recurrence;")
