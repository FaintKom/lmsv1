"""add offset_dy column to user_room_equips

Lets every room item move on the Y axis (up/down) via the Layout d-pad.
Floor clamping is enforced client-side (Math.max(0, pos.y + dy)) so the
DB just stores the raw signed offset.

Idempotent: ALTER ... ADD COLUMN IF NOT EXISTS.
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "t8u9v0w1x2y3"
down_revision: Union[str, None] = "s7t8u9v0w1x2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE user_room_equips ADD COLUMN IF NOT EXISTS "
        "offset_dy INTEGER NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE user_room_equips DROP COLUMN IF EXISTS offset_dy")
