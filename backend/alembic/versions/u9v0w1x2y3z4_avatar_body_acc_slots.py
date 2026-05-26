"""add body slot + 4 accessory slots to avatar catalog

Splits the single avatar_accessory slot into 4 layered slots so students
can wear multiple items at once (hat + glasses + back item + hand item).
Adds avatar_body slot with boy + girl base shape options.

New slot ids:
  avatar_body      -- character base shape
  avatar_hat       -- hats, caps, crowns
  avatar_glasses   -- eyewear overlay
  avatar_back      -- backpack, cape, wings
  avatar_hand      -- held item (book, sword, pet)

Old avatar_accessory items stay in the table (item_type='avatar',
slot='avatar_accessory') but the slot is no longer shown in the avatar
builder UI; equipping one is harmless and lets us deprecate gradually.

Idempotent.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "u9v0w1x2y3z4"
down_revision: Union[str, None] = "t8u9v0w1x2y3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (id, slot, group_name, name, price, is_default)
NEW_ITEMS: list[tuple[str, str, str, str, int, bool]] = [
    # bodies
    ("avatar-body-boy",  "avatar_body", "Body", "Boy",  0,   True),
    ("avatar-body-girl", "avatar_body", "Body", "Girl", 0,   False),
    # hats
    ("avatar-hat-cap",       "avatar_hat", "Hat", "Baseball cap",   80,  False),
    ("avatar-hat-beanie",    "avatar_hat", "Hat", "Beanie",         60,  False),
    ("avatar-hat-wizard",    "avatar_hat", "Hat", "Wizard hat",     250, False),
    ("avatar-hat-crown",     "avatar_hat", "Hat", "Party crown",    180, False),
    ("avatar-hat-chef",      "avatar_hat", "Hat", "Chef hat",       150, False),
    ("avatar-hat-graduate",  "avatar_hat", "Hat", "Graduate cap",   220, False),
    # glasses
    ("avatar-glasses-round",   "avatar_glasses", "Glasses", "Round glasses",  120, False),
    ("avatar-glasses-shades",  "avatar_glasses", "Glasses", "Sunglasses",     100, False),
    ("avatar-glasses-monocle", "avatar_glasses", "Glasses", "Monocle",        180, False),
    ("avatar-glasses-ski",     "avatar_glasses", "Glasses", "Ski goggles",    160, False),
    ("avatar-glasses-3d",      "avatar_glasses", "Glasses", "3D glasses",     90,  False),
    # back
    ("avatar-back-backpack",  "avatar_back", "Back", "Backpack",      120, False),
    ("avatar-back-cape",      "avatar_back", "Back", "Hero cape",     350, False),
    ("avatar-back-wings",     "avatar_back", "Back", "Angel wings",   500, False),
    ("avatar-back-quiver",    "avatar_back", "Back", "Arrow quiver",  200, False),
    ("avatar-back-jetpack",   "avatar_back", "Back", "Jetpack",       450, False),
    # hand
    ("avatar-hand-book",       "avatar_hand", "Hand", "Book",       80,  False),
    ("avatar-hand-sword",      "avatar_hand", "Hand", "Sword",      200, False),
    ("avatar-hand-pet",        "avatar_hand", "Hand", "Mini pet",   500, False),
    ("avatar-hand-flower",     "avatar_hand", "Hand", "Flower",     60,  False),
    ("avatar-hand-balloon",    "avatar_hand", "Hand", "Balloon",    90,  False),
    ("avatar-hand-controller", "avatar_hand", "Hand", "Controller", 150, False),
]


def upgrade() -> None:
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
    for row in NEW_ITEMS:
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
    ids = ",".join(f"'{row[0]}'" for row in NEW_ITEMS)
    bind.execute(sa.text(f"DELETE FROM room_items WHERE id IN ({ids})"))
