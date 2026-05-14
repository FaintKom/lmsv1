"""add srs_flashcard, crossword, word_search, map_pin_drop, bubble_sheet exercise types

Revision ID: p4q5r6s7t8u9
Revises: o3p4q5r6s7t8
Create Date: 2026-05-14

Adds five new values to the `exercisetype` PG enum. Idempotent
via `ADD VALUE IF NOT EXISTS`.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "p4q5r6s7t8u9"
down_revision: Union[str, None] = "o3p4q5r6s7t8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'srs_flashcard'")
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'crossword'")
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'word_search'")
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'map_pin_drop'")
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'bubble_sheet'")


def downgrade() -> None:
    pass
