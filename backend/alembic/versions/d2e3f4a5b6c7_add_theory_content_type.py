"""add theory content type

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-05-29 12:00:00.000000

Adds the `theory` value to the `contenttype` PG enum so lessons can hold a
slide-presentation block (PDF / PPTX / Google Slides). Idempotent via
`ADD VALUE IF NOT EXISTS`.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL ALTER TYPE ADD VALUE cannot run inside a transaction block on
    # PG < 12; IF NOT EXISTS keeps it rerun-safe (main.py also applies this as a
    # startup fallback).
    op.execute("ALTER TYPE contenttype ADD VALUE IF NOT EXISTS 'theory'")


def downgrade() -> None:
    # PostgreSQL cannot drop an enum value without recreating the type.
    # Intentionally a no-op (removing enum values is destructive).
    pass
