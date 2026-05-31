"""merge heads: room_placed + class_sessions

Revision ID: c6d7e8f9a0b1
Revises: a3b4c5d6e7f8, b5c6d7e8f9a0
Create Date: 2026-05-31

The freeform-room (a3b4c5d6e7f8) and class-sessions (b5c6d7e8f9a0) features
landed on separate branches off the same parent, leaving two alembic heads.
This is a no-op merge that re-unifies them so `alembic upgrade head` works.
"""

revision = "c6d7e8f9a0b1"
down_revision = ("a3b4c5d6e7f8", "b5c6d7e8f9a0")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
