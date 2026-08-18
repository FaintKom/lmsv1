"""link a recording to its lesson, and give it a life span

Hand-written. `--autogenerate` against this repository's development database
proposes dropping unrelated indexes, because that database was built by
`create_all` rather than by replaying the chain.

Three columns, all additive and all defaulted, so no existing row is rewritten:

- live_lesson_id  which lesson it came from; null for everything recorded
                  before lessons could be recorded at all
- shared_with_group  staff-only until a teacher deliberately shares it
- expires_at      when the retention sweep may delete it

The per-school switch and retention period are not here: `organizations` already
carries a `settings` JSONB that the admin API edits, which is exactly what it is
for. Two more columns would have bought nothing.

Revision ID: r3c0rd1ng5x
Revises: lk1br3ak0ut5
Create Date: 2026-08-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "r3c0rd1ng5x"
down_revision: Union[str, None] = "lk1br3ak0ut5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recordings",
        sa.Column("live_lesson_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_recordings_live_lesson_id",
        "recordings",
        "live_lessons",
        ["live_lesson_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_recordings_live_lesson_id", "recordings", ["live_lesson_id"])
    op.add_column(
        "recordings",
        sa.Column("shared_with_group", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "recordings",
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    # The sweep asks "whose recordings expire soon", so it wants both.
    op.create_index("ix_recordings_org_expires", "recordings", ["org_id", "expires_at"])


def downgrade() -> None:
    op.drop_index("ix_recordings_org_expires", table_name="recordings")
    op.drop_column("recordings", "expires_at")
    op.drop_column("recordings", "shared_with_group")
    op.drop_index("ix_recordings_live_lesson_id", table_name="recordings")
    op.drop_constraint("fk_recordings_live_lesson_id", "recordings", type_="foreignkey")
    op.drop_column("recordings", "live_lesson_id")
