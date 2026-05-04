"""add lemonsqueezy provider fields to subscriptions and invoices

Adds the minimum schema needed to persist Lemon Squeezy subscriptions
and invoices alongside Stripe ones:

* ``subscriptions.provider`` — 'stripe' or 'lemonsqueezy'. Existing rows
  are backfilled to 'stripe' since the table had only Stripe rows before.
* ``subscriptions.ls_{subscription,variant,customer}_id`` — LS identifiers.
* ``subscriptions.stripe_subscription_id`` → becomes nullable so LS
  rows don't have to fake a Stripe ID.
* ``invoices.provider`` + ``invoices.ls_invoice_id``, same pattern.

Variant IDs per tier are stored in environment variables, not in the
database — the mapping is config, not data. That keeps the plans table
clean and lets us rotate variants without a migration.

Revision ID: l1m2n3o4p5q6
Revises: k1l2m3n4o5p6
Create Date: 2026-04-20

"""
from alembic import op
import sqlalchemy as sa


revision = "l1m2n3o4p5q6"
down_revision = "k1l2m3n4o5p6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- subscriptions ---
    op.add_column(
        "subscriptions",
        sa.Column(
            "provider",
            sa.String(length=20),
            nullable=False,
            server_default="stripe",
        ),
    )
    op.add_column(
        "subscriptions",
        sa.Column("ls_subscription_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "subscriptions",
        sa.Column("ls_variant_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "subscriptions",
        sa.Column("ls_customer_id", sa.String(length=64), nullable=True),
    )
    op.alter_column(
        "subscriptions",
        "stripe_subscription_id",
        existing_type=sa.String(length=255),
        nullable=True,
    )
    op.create_index(
        "ix_subscriptions_ls_subscription_id",
        "subscriptions",
        ["ls_subscription_id"],
        unique=True,
        postgresql_where=sa.text("ls_subscription_id IS NOT NULL"),
    )

    # --- invoices ---
    op.add_column(
        "invoices",
        sa.Column(
            "provider",
            sa.String(length=20),
            nullable=False,
            server_default="stripe",
        ),
    )
    op.add_column(
        "invoices",
        sa.Column("ls_invoice_id", sa.String(length=255), nullable=True),
    )
    op.alter_column(
        "invoices",
        "stripe_invoice_id",
        existing_type=sa.String(length=255),
        nullable=True,
    )


def downgrade() -> None:
    # --- invoices ---
    op.alter_column(
        "invoices",
        "stripe_invoice_id",
        existing_type=sa.String(length=255),
        nullable=False,
    )
    op.drop_column("invoices", "ls_invoice_id")
    op.drop_column("invoices", "provider")

    # --- subscriptions ---
    op.drop_index(
        "ix_subscriptions_ls_subscription_id", table_name="subscriptions"
    )
    op.alter_column(
        "subscriptions",
        "stripe_subscription_id",
        existing_type=sa.String(length=255),
        nullable=False,
    )
    op.drop_column("subscriptions", "ls_customer_id")
    op.drop_column("subscriptions", "ls_variant_id")
    op.drop_column("subscriptions", "ls_subscription_id")
    op.drop_column("subscriptions", "provider")
