"""add schedule_slots (weekly recurring timetable)

Revision ID: b1c2d3e4f5a6
Revises: c6d7e8f9a0b1
Create Date: 2026-05-31

Weekly-recurring class timetable. One row = a course meeting on a day-of-week
at a start/end time, optionally in a room. Distinct from one-off calendar
events, live meetings, and the per-day journal/attendance register.

Idempotent — skips creation if the table already exists (the lifespan
create_all fallback may have made it first).
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "b1c2d3e4f5a6"
down_revision = "c6d7e8f9a0b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "schedule_slots" in sa.inspect(bind).get_table_names():
        return
    op.create_table(
        "schedule_slots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "org_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("note", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_schedule_slots_org_course", "schedule_slots", ["org_id", "course_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_schedule_slots_org_course", table_name="schedule_slots")
    op.drop_table("schedule_slots")
