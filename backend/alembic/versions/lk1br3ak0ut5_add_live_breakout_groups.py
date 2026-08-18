"""add live breakout groups

Hand-written, and deliberately so. `--autogenerate` produced a migration that
did not create this table at all — the local development database already had
it, left over from a `create_all` run — and proposed dropping
`uq_live_lessons_active_group`, the partial unique index that keeps one active
lesson per group. Applying that to production would have removed a real
constraint to add nothing.

Revision ID: lk1br3ak0ut5
Revises: f6a7b8c9d0e1
Create Date: 2026-08-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "lk1br3ak0ut5"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "live_breakout_groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "live_lesson_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("live_lessons.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "org_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("index", sa.Integer(), nullable=False),
        sa.Column("member_ids", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("live_lesson_id", "index", name="uq_breakout_lesson_index"),
    )
    op.create_index(
        "ix_live_breakout_groups_live_lesson_id",
        "live_breakout_groups",
        ["live_lesson_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_live_breakout_groups_live_lesson_id", table_name="live_breakout_groups")
    op.drop_table("live_breakout_groups")
