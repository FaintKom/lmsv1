"""add room module: room_items catalog + user_room_equips

Adds the My Room gamification feature. `room_items` is a catalog of ~36
purchasable items (walls/floor/furniture/decor) seeded from the design spec.
`user_room_equips` tracks each student's equipped item per slot plus an
optional layout offset (Layout d-pad). Ownership is DERIVED: an item is
unlocked when `user_streaks.total_xp >= room_items.price` -- no separate
'owned' table, no XP decrement on equip.

Idempotent: all CREATE statements use IF NOT EXISTS, seed uses
ON CONFLICT DO NOTHING. Safe to re-run via `_run_setup` fallback.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "q5r6s7t8u9v0"
down_revision: Union[str, None] = "p4q5r6s7t8u9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Catalog rows match design_files/room-voxels.jsx CATALOG verbatim.
# (id, slot, group_name, name, price, is_default, swatch, color_hex, floor_type)
CATALOG: list[tuple[str, str, str, str, int, bool, str | None, str | None, str | None]] = [
    # walls
    ("wall-lavender", "wall", "Walls", "Lavender", 0,   True,  "#a48dc8", "a48dc8", None),
    ("wall-mint",     "wall", "Walls", "Mint",     120, False, "#65c8b3", "65c8b3", None),
    ("wall-coral",    "wall", "Walls", "Coral",    120, False, "#f2a48d", "f2a48d", None),
    ("wall-sage",     "wall", "Walls", "Sage",     120, False, "#b4ccaa", "b4ccaa", None),
    ("wall-sky",      "wall", "Walls", "Sky",      180, False, "#a9c8d9", "a9c8d9", None),
    ("wall-sun",      "wall", "Walls", "Sun",      200, False, "#f2d878", "f2d878", None),
    # floors
    ("floor-wood",    "floor", "Floor", "Light wood", 0,   True,  "#d9a26a", None, "wood"),
    ("floor-tile",    "floor", "Floor", "Cream tile", 150, False, "#e8e1ce", None, "tile"),
    ("floor-carpet",  "floor", "Floor", "Coral rug",  250, False, "#ffae9a", None, "carpet"),
    ("floor-moss",    "floor", "Floor", "Moss grass", 320, False, "#7fb069", None, "moss"),
    # furniture
    ("bed-basic",     "bed",       "Furniture", "Wooden bed",     0,   True,  None, None, None),
    ("bed-kids",      "bed",       "Furniture", "Kids bed",       350, False, None, None, None),
    ("bed-double",    "bed",       "Furniture", "Double bed",     600, False, None, None, None),
    ("desk-wood",     "desk",      "Furniture", "Wooden desk",    220, True,  None, None, None),
    ("desk-white",    "desk",      "Furniture", "Studio desk",    400, False, None, None, None),
    ("dresser-blue",  "dresser",   "Furniture", "Mint dresser",   280, True,  None, None, None),
    ("dresser-cream", "dresser",   "Furniture", "Cream dresser",  280, False, None, None, None),
    ("shelf-tall",    "shelf",     "Furniture", "Tall bookshelf", 360, False, None, None, None),
    ("shelf-wall",    "shelfwall", "Furniture", "Wall shelf",     180, True,  None, None, None),
    ("cabinet",       "cabinet",   "Furniture", "Sun cabinet",    240, False, None, None, None),
    ("sofa",          "sofa",      "Furniture", "Cream sofa",     480, False, None, None, None),
    ("coffee-table",  "coffee",    "Furniture", "Coffee table",   200, False, None, None, None),
    ("arcade",        "arcade",    "Furniture", "Retro arcade",   950, False, None, None, None),
    # decor
    ("chair",         "chair",    "Decor", "Desk chair",    120, True,  None, None, None),
    ("monitor",       "monitor",  "Decor", "Monitor",       280, True,  None, None, None),
    ("lamp",          "lamp",     "Decor", "Floor lamp",    150, True,  None, None, None),
    ("plant",         "plant",    "Decor", "Potted plant",  80,  True,  None, None, None),
    ("rug-teal",      "rug",      "Decor", "Teal rug",      140, True,  None, None, None),
    ("rug-warm",      "rug",      "Decor", "Warm rug",      140, False, None, None, None),
    ("rug-mint",      "rug",      "Decor", "Mint rug",      140, False, None, None, None),
    ("pictures",      "pictures", "Decor", "Picture wall",  100, True,  None, None, None),
    ("window",        "window",   "Decor", "Window",        0,   True,  None, None, None),
    ("plushie",       "plushie",  "Decor", "Bunny plushie", 200, False, None, None, None),
    ("trophy",        "trophy",   "Decor", "Trophy",        220, False, None, None, None),
    ("clock",         "clock",    "Decor", "Wall clock",    90,  False, None, None, None),
]


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS room_items (
            id          VARCHAR(60)  PRIMARY KEY,
            slot        VARCHAR(40)  NOT NULL,
            group_name  VARCHAR(20)  NOT NULL,
            name        VARCHAR(80)  NOT NULL,
            i18n_key    VARCHAR(80)  NOT NULL,
            price       INTEGER      NOT NULL DEFAULT 0,
            is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
            swatch      VARCHAR(20),
            color_hex   VARCHAR(8),
            floor_type  VARCHAR(20),
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_room_items_slot ON room_items(slot)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_room_equips (
            user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            slot       VARCHAR(40)  NOT NULL,
            item_id    VARCHAR(60)  REFERENCES room_items(id) ON DELETE SET NULL,
            offset_dx  INTEGER      NOT NULL DEFAULT 0,
            offset_dz  INTEGER      NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            CONSTRAINT pk_user_room_equips PRIMARY KEY (user_id, slot)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_user_room_equips_user_id ON user_room_equips(user_id)"
    )

    # Seed catalog. ON CONFLICT keeps existing rows untouched if owners hand-tune prices.
    insert_sql = sa.text(
        """
        INSERT INTO room_items
            (id, slot, group_name, name, i18n_key, price, is_default, swatch, color_hex, floor_type)
        VALUES
            (:id, :slot, :group_name, :name, :i18n_key, :price, :is_default, :swatch, :color_hex, :floor_type)
        ON CONFLICT (id) DO NOTHING
        """
    )
    bind = op.get_bind()
    for row in CATALOG:
        bid, slot, group_name, name, price, is_default, swatch, color_hex, floor_type = row
        bind.execute(
            insert_sql,
            {
                "id": bid,
                "slot": slot,
                "group_name": group_name,
                "name": name,
                "i18n_key": f"room.item.{bid}",
                "price": price,
                "is_default": is_default,
                "swatch": swatch,
                "color_hex": color_hex,
                "floor_type": floor_type,
            },
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_room_equips")
    op.execute("DROP TABLE IF EXISTS room_items")
