"""add live_lessons.programme (conductor step list)

Revision ID: c7d8e9f0a1b2
Revises: 8327192f0196
Create Date: 2026-08-11

The teacher's conductor programme (reordered / hidden steps) used to live in
React state only, so a reload dropped it mid-lesson. NULL keeps the old
behaviour: follow the auto list derived from the picked material.
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "c7d8e9f0a1b2"
down_revision = "8327192f0196"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "live_lessons",
        sa.Column("programme", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("live_lessons", "programme")
