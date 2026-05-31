"""add class_sessions (class journal)

Revision ID: b5c6d7e8f9a0
Revises: x1y2z3a4b5c6
Create Date: 2026-05-31

Class journal (классный журнал) — one register row per (course, date) recording
whether the session was held, its topic and notes. Attendance for the same
(course, date) is NOT duplicated here; it stays in ``attendance_records``.

Rerun-safe (IF NOT EXISTS) because `_run_setup` in app/main.py re-applies the
schema via Base.metadata.create_all on every boot as a fallback.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b5c6d7e8f9a0"
down_revision: Union[str, None] = "x1y2z3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS class_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            session_date DATE NOT NULL,
            held BOOLEAN NOT NULL DEFAULT TRUE,
            topic VARCHAR(500) NOT NULL DEFAULT '',
            notes TEXT,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_class_sessions_course_date UNIQUE (course_id, session_date)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_class_sessions_org_id ON class_sessions (org_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_class_sessions_course_id ON class_sessions (course_id)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS class_sessions")
