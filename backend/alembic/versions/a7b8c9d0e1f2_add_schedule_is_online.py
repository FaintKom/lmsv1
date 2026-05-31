"""add schedule_slots.is_online (optional Jitsi online slot)

Revision ID: a7b8c9d0e1f2
Revises: b1c2d3e4f5a6
Create Date: 2026-05-31

Adds a boolean ``is_online`` flag to ``schedule_slots``. When True the slot
meets online in a derived Jitsi room (URL is derived from the slot id in the
service layer, nothing is stored here). Existing rows backfill to False.

Idempotent (``IF NOT EXISTS``) so it is safe to re-run alongside the
``_run_setup`` boot-time ALTER fallback in app/main.py.
"""

from alembic import op

revision = "a7b8c9d0e1f2"
down_revision = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE schedule_slots "
        "ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE schedule_slots DROP COLUMN IF EXISTS is_online")
