"""add quiz/assignment time-on-task

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-05-31 12:00:00.000000

Phase 2 of "task statistics for methodists": extend the per-attempt time-on-task
capture (added to exercise_submissions in Phase 1, migration e3f4a5b6c7d8) to the
two remaining submission models — quiz_submissions and assignment_submissions.

All three columns are nullable for backward-compat (older rows / clients that
don't send elapsed_seconds keep NULL). Also adds composite (task_id, student_id)
indexes powering the Phase 2 task-stats GROUP BY aggregates. Mirrored as
rerun-safe ALTER ... ADD COLUMN IF NOT EXISTS in main.py `_run_setup()` so prod
gets them on next deploy (migrations alone do not reach prod — see
backend/CLAUDE.md).
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f4a5b6c7d8e9"
down_revision: Union[str, None] = "e3f4a5b6c7d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS keeps this rerun-safe (main.py applies the same ALTERs as a
    # startup fallback).
    for table in ("quiz_submissions", "assignment_submissions"):
        op.execute(
            f"ALTER TABLE {table} "
            "ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE"
        )
        op.execute(
            f"ALTER TABLE {table} "
            "ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER"
        )
        op.execute(
            f"ALTER TABLE {table} "
            "ADD COLUMN IF NOT EXISTS attempt_number INTEGER"
        )

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_quiz_submissions_quiz_student "
        "ON quiz_submissions (quiz_id, student_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_assignment_submissions_assignment_student "
        "ON assignment_submissions (assignment_id, student_id)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_assignment_submissions_assignment_student")
    op.execute("DROP INDEX IF EXISTS ix_quiz_submissions_quiz_student")
    for table in ("quiz_submissions", "assignment_submissions"):
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS attempt_number")
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS time_spent_seconds")
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS started_at")
