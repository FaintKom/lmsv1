"""fix nullable fks for unified exercises

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-03-16 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make quiz_id and challenge_id nullable so new exercises
    # created via the unified system don't need old quiz/challenge records
    op.execute("ALTER TABLE questions ALTER COLUMN quiz_id DROP NOT NULL")
    op.execute("ALTER TABLE test_cases ALTER COLUMN challenge_id DROP NOT NULL")


def downgrade() -> None:
    op.execute("ALTER TABLE questions ALTER COLUMN quiz_id SET NOT NULL")
    op.execute("ALTER TABLE test_cases ALTER COLUMN challenge_id SET NOT NULL")
