"""add submission time-on-task

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-05-31 10:00:00.000000

Phase 1 of "task statistics for methodists": capture per-attempt time-on-task
and attempt number on exercise_submissions. All three columns are nullable for
backward-compat (older rows / clients that don't send elapsed_seconds keep
NULL). Mirrored as a rerun-safe ALTER ... ADD COLUMN IF NOT EXISTS in
main.py `_run_setup()` so prod gets them on next deploy (migrations alone do
not reach prod — see backend/CLAUDE.md).
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, None] = "d2e3f4a5b6c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS keeps this rerun-safe (main.py applies the same ALTERs as a
    # startup fallback).
    op.execute(
        "ALTER TABLE exercise_submissions "
        "ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE"
    )
    op.execute(
        "ALTER TABLE exercise_submissions "
        "ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER"
    )
    op.execute(
        "ALTER TABLE exercise_submissions "
        "ADD COLUMN IF NOT EXISTS attempt_number INTEGER"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE exercise_submissions DROP COLUMN IF EXISTS attempt_number")
    op.execute("ALTER TABLE exercise_submissions DROP COLUMN IF EXISTS time_spent_seconds")
    op.execute("ALTER TABLE exercise_submissions DROP COLUMN IF EXISTS started_at")
