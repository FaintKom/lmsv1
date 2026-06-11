"""Add lesson_highlights table — per-student theory text annotations

Students can highlight or underline text in theory lessons; marks persist
per (user, lesson). Offsets anchor into the rendered plain text; the stored
snippet lets the frontend drop stale marks after content edits.

Revision ID: hl1a2b3c4d5
Revises: s1te5e1f2a3
Create Date: 2026-06-11
"""

from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "hl1a2b3c4d5"
down_revision: Union[str, None] = "s1te5e1f2a3"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        "lesson_highlights",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "block_key", sa.String(length=64), nullable=False, server_default=""
        ),
        sa.Column("start_offset", sa.Integer(), nullable=False),
        sa.Column("end_offset", sa.Integer(), nullable=False),
        sa.Column(
            "kind", sa.String(length=16), nullable=False, server_default="highlight"
        ),
        sa.Column("text_snippet", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_lesson_highlights_user_id", "lesson_highlights", ["user_id"]
    )
    op.create_index(
        "ix_lesson_highlights_lesson_id", "lesson_highlights", ["lesson_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_lesson_highlights_lesson_id", table_name="lesson_highlights")
    op.drop_index("ix_lesson_highlights_user_id", table_name="lesson_highlights")
    op.drop_table("lesson_highlights")
