"""remove avatar sword item (off-theme for an LMS)

Revision ID: y2z3a4b5c6d7
Revises: x1y2z3a4b5c6
Create Date: 2026-05-31

The "Sword" hand item is removed from the avatar wardrobe. `user_room_equips.item_id`
is ON DELETE SET NULL, so any student who had it equipped just gets an empty hand
slot — no orphaned rows. Rerun-safe.
"""

from alembic import op

revision = "y2z3a4b5c6d7"
down_revision = "x1y2z3a4b5c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DELETE FROM room_items WHERE id = 'avatar-hand-sword'")


def downgrade() -> None:
    op.execute(
        """
        INSERT INTO room_items
            (id, slot, group_name, name, i18n_key, price, is_default,
             swatch, color_hex, floor_type, item_type)
        VALUES
            ('avatar-hand-sword', 'avatar_hand', 'Hand', 'Sword',
             'room.item.avatar-hand-sword', 200, false,
             NULL, NULL, NULL, 'avatar')
        ON CONFLICT (id) DO NOTHING
        """
    )
