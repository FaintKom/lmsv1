"""add managed rooms + schedule_slots.room_id link

Adds the org-level managed-rooms feature (Journal Phase 1):

  * ``rooms`` — a per-org catalog of bookable physical locations.
  * ``schedule_slots.room_id`` — optional FK linking a timetable slot to a room
    (ON DELETE SET NULL so deleting a room just drops the link and keeps the
    slot's free-text ``location``). This enables room-clash detection.

Distinct from the cosmetic "My Room" gamification tables (``room_items`` /
``user_room_equips``).

Idempotent: ``CREATE TABLE IF NOT EXISTS`` + ``ADD COLUMN IF NOT EXISTS`` so it
is safe to re-run via the ``_run_setup`` boot-time fallback in main.py.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS rooms (
            id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id      UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name        VARCHAR(120) NOT NULL,
            capacity    INTEGER,
            site        VARCHAR(120) NOT NULL DEFAULT '',
            active      BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_rooms_org ON rooms(org_id)")
    op.execute(
        "ALTER TABLE schedule_slots "
        "ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id) ON DELETE SET NULL"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE schedule_slots DROP COLUMN IF EXISTS room_id")
    op.execute("DROP TABLE IF EXISTS rooms")
