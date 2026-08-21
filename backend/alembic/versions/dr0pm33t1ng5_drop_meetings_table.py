"""Drop the meetings table — Jitsi has left the product.

Revision ID: dr0pm33t1ng5
Revises: p4g3sv3rs10n
Create Date: 2026-08-21

The `meetings` table backed video rooms, a separate feature from the live
lessons it sat beside in the menu. The model is gone, so without this the
database would keep a table nothing maps to.

Nothing referenced it: no foreign key anywhere pointed at meetings.id, so
there is no cascade and there are no orphans to worry about.
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "dr0pm33t1ng5"
down_revision = "p4g3sv3rs10n"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Guarded because on this project the app's own `_run_setup` calls
    # Base.metadata.create_all before `alembic upgrade head` gets its turn, and
    # a deploy may replay this revision against a database where the table has
    # already gone. An unguarded drop_table raises there.
    if sa.inspect(op.get_bind()).has_table("meetings"):
        op.drop_table("meetings")


def downgrade() -> None:
    # Brings back the shape, not the contents. Nothing here restores rows, and
    # this migration does not pretend otherwise.
    if sa.inspect(op.get_bind()).has_table("meetings"):
        return
    op.create_table(
        "meetings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("courses.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("room_url", sa.String(500), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recording_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
