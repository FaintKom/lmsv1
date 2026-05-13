"""add scorm_package and math_stepwise exercise types

Revision ID: n2p3q4r5s6t7
Revises: m1n2o3p4q5r6
Create Date: 2026-05-13

Adds two new values to the `exercisetype` PG enum so the unified exercise
menu can offer SCORM/xAPI imports and stepwise-math problems. Idempotent
via `ADD VALUE IF NOT EXISTS`.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "n2p3q4r5s6t7"
down_revision: Union[str, None] = "m1n2o3p4q5r6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'scorm_package'")
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'math_stepwise'")


def downgrade() -> None:
    pass
