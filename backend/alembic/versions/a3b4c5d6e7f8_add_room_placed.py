"""add user_room_placed (freeform room item instances)

Revision ID: a3b4c5d6e7f8
Revises: y2z3a4b5c6d7
Create Date: 2026-05-31

Freeform room: students place any number of furniture/decor items anywhere
(vs the old one-item-per-slot model). Avatar parts stay slot-based in
user_room_equips; this table is room furniture/decor only.

Idempotent — skips creation if the table already exists (the lifespan
create_all fallback may have made it first).
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "a3b4c5d6e7f8"
down_revision = "y2z3a4b5c6d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "user_room_placed" in sa.inspect(bind).get_table_names():
        return
    op.create_table(
        "user_room_placed",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "item_id",
            sa.String(length=60),
            sa.ForeignKey("room_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("x", sa.Float(), nullable=False, server_default="0"),
        sa.Column("y", sa.Float(), nullable=False, server_default="0"),
        sa.Column("z", sa.Float(), nullable=False, server_default="0"),
        sa.Column("rot", sa.Float(), nullable=False, server_default="0"),
        sa.Column("scale", sa.Float(), nullable=False, server_default="1"),
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
        sa.UniqueConstraint("user_id", "item_id", name="uq_user_room_placed_user_item"),
    )
    op.create_index("ix_user_room_placed_user_id", "user_room_placed", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_room_placed_user_id", table_name="user_room_placed")
    op.drop_table("user_room_placed")
