"""add stereometry exercise type

Solids with a numeric answer — volume, surface area, lateral area. The value
has to reach the enum before any exercise can carry the type, and PostgreSQL
only grows enums — see docs/MIGRATIONS.md.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-13 20:40:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block, so
    # IF NOT EXISTS keeps it idempotent across a retried deploy.
    # exercisetype only, for the same reason as math_system: ContentType
    # (app/courses/models.py) stopped tracking exercise types after the
    # 2026-03 game batch, so adding it there would put a name in the database
    # enum that no Python enum has.
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'stereometry'")


def downgrade() -> None:
    # PostgreSQL has no DROP VALUE. Removing it would mean rebuilding the enum
    # and rewriting every row that references it — destructive, and pointless
    # for a value that is simply unused after a rollback.
    pass
