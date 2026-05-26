"""add avatar items: extend room_items with item_type + seed 23 avatar parts

Adds the My Avatar feature. Avatar parts (hair / face / outfit / accessory)
share the existing room_items + user_room_equips infrastructure -- they're
just rows with item_type='avatar' and avatar_* slot ids.

Migration:
1. ALTER room_items ADD item_type VARCHAR(20) NOT NULL DEFAULT 'room'
   (backfills all existing rows to 'room' via the default).
2. INSERT 23 avatar items with ON CONFLICT DO NOTHING.

Idempotent: safe to re-run via `_run_setup` fallback.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "r6s7t8u9v0w1"
down_revision: Union[str, None] = "q5r6s7t8u9v0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Avatar catalog. Tuple shape: (id, slot, group_name, name, price, is_default)
AVATAR_CATALOG: list[tuple[str, str, str, str, int, bool]] = [
    # hair
    ("avatar-hair-short",   "avatar_hair", "Hair", "Short brown",  0,   True),
    ("avatar-hair-bald",    "avatar_hair", "Hair", "Bald",         50,  False),
    ("avatar-hair-long",    "avatar_hair", "Hair", "Long blonde",  80,  False),
    ("avatar-hair-curly",   "avatar_hair", "Hair", "Curly red",    150, False),
    ("avatar-hair-bun",     "avatar_hair", "Hair", "Top bun",      150, False),
    ("avatar-hair-mohawk",  "avatar_hair", "Hair", "Mohawk",       200, False),
    # face
    ("avatar-face-smile",      "avatar_face", "Face", "Smile",         0,   True),
    ("avatar-face-wink",       "avatar_face", "Face", "Wink",          80,  False),
    ("avatar-face-blush",      "avatar_face", "Face", "Blush",         80,  False),
    ("avatar-face-cool",       "avatar_face", "Face", "Sunglasses",    100, False),
    ("avatar-face-determined", "avatar_face", "Face", "Determined",    120, False),
    ("avatar-face-glasses",    "avatar_face", "Face", "Round glasses", 150, False),
    # outfit
    ("avatar-outfit-tshirt", "avatar_outfit", "Outfit", "Blue t-shirt",   0,   True),
    ("avatar-outfit-cozy",   "avatar_outfit", "Outfit", "Cozy sweater",   180, False),
    ("avatar-outfit-hoodie", "avatar_outfit", "Outfit", "Green hoodie",   150, False),
    ("avatar-outfit-dress",  "avatar_outfit", "Outfit", "Coral dress",    200, False),
    ("avatar-outfit-sport",  "avatar_outfit", "Outfit", "Sport kit",      250, False),
    ("avatar-outfit-suit",   "avatar_outfit", "Outfit", "Formal suit",    400, False),
    # accessory (no default -- slot starts empty)
    ("avatar-acc-book",       "avatar_accessory", "Accessory", "Book",        80,  False),
    ("avatar-acc-backpack",   "avatar_accessory", "Accessory", "Backpack",    100, False),
    ("avatar-acc-headphones", "avatar_accessory", "Accessory", "Headphones",  180, False),
    ("avatar-acc-cape",       "avatar_accessory", "Accessory", "Hero cape",   350, False),
    ("avatar-acc-pet",        "avatar_accessory", "Accessory", "Mini pet",    500, False),
]


def upgrade() -> None:
    op.execute(
        "ALTER TABLE room_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) "
        "NOT NULL DEFAULT 'room'"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_room_items_item_type ON room_items(item_type)"
    )

    insert_sql = sa.text(
        """
        INSERT INTO room_items
            (id, slot, group_name, name, i18n_key, price, is_default,
             swatch, color_hex, floor_type, item_type)
        VALUES
            (:id, :slot, :group_name, :name, :i18n_key, :price, :is_default,
             NULL, NULL, NULL, 'avatar')
        ON CONFLICT (id) DO NOTHING
        """
    )
    bind = op.get_bind()
    for row in AVATAR_CATALOG:
        bid, slot, group_name, name, price, is_default = row
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
            },
        )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DELETE FROM room_items WHERE item_type = 'avatar'"))
    op.execute("DROP INDEX IF EXISTS ix_room_items_item_type")
    op.execute("ALTER TABLE room_items DROP COLUMN IF EXISTS item_type")
