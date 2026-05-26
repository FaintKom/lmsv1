"""add offset_rot column to user_room_equips

Lets students rotate any room item (and the avatar) around the vertical
axis via the Layout d-pad. Stored as degrees (int) in [0, 360); the
frontend snaps to 10-degree increments per click.

Idempotent: ALTER ... ADD COLUMN IF NOT EXISTS.
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "s7t8u9v0w1x2"
down_revision: Union[str, None] = "r6s7t8u9v0w1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE user_room_equips ADD COLUMN IF NOT EXISTS "
        "offset_rot INTEGER NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE user_room_equips DROP COLUMN IF EXISTS offset_rot")
