"""add 5 new exercise types: srs_flashcard, crossword, word_search, map_pin_drop, bubble_sheet

Revision ID: n1o2p3q4r5s6
Revises: m1n2o3p4q5r6
Create Date: 2026-05-03

Adds five new values to the `exercisetype` Postgres enum so the app can
persist Exercise rows of these new types. Each `ALTER TYPE … ADD VALUE
IF NOT EXISTS` is idempotent.
"""
from typing import Sequence, Union

from alembic import op


revision: str = "n1o2p3q4r5s6"
down_revision: Union[str, None] = "m1n2o3p4q5r6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_NEW_VALUES = [
    "srs_flashcard",
    "crossword",
    "word_search",
    "map_pin_drop",
    "bubble_sheet",
]


def upgrade() -> None:
    for v in _NEW_VALUES:
        op.execute(f"ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS '{v}'")


def downgrade() -> None:
    # Postgres does not support removing enum values. To downgrade,
    # the enum would need to be recreated and all rows migrated.
    pass
