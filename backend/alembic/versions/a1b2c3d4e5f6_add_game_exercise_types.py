"""add game exercise types

Revision ID: a1b2c3d4e5f6
Revises: f2a3b4c5d6e7
Create Date: 2026-03-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new exercise types to exercisetype enum
    # PostgreSQL ALTER TYPE ADD VALUE cannot run inside a transaction block,
    # so we use IF NOT EXISTS to make it idempotent.
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'robot_2d'")
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'math_interactive'")
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'world_3d'")

    # Add new content types to contenttype enum
    op.execute("ALTER TYPE contenttype ADD VALUE IF NOT EXISTS 'robot_2d'")
    op.execute("ALTER TYPE contenttype ADD VALUE IF NOT EXISTS 'math_interactive'")
    op.execute("ALTER TYPE contenttype ADD VALUE IF NOT EXISTS 'world_3d'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values directly.
    # To downgrade, you would need to recreate the enum type without the new values.
    # This is intentionally left as a no-op since removing enum values is destructive.
    pass
