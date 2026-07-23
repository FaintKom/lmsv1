"""add live lessons

Revision ID: 8327192f0196
Revises: hl1a2b3c4d5
Create Date: 2026-07-23 20:30:57.230751
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8327192f0196"
down_revision: Union[str, None] = "hl1a2b3c4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS live_lessons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            group_id UUID NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
            course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
            teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
            class_session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            follow_mode VARCHAR(10) NOT NULL DEFAULT 'free',
            current_scene JSONB,
            ended_at TIMESTAMPTZ,
            summary JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_live_lessons_org_id ON live_lessons (org_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_live_lessons_group_id ON live_lessons (group_id)")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_live_lessons_active_group "
        "ON live_lessons (group_id) WHERE status = 'active'"
    )
    op.execute("""
        CREATE TABLE IF NOT EXISTS lesson_boards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            live_lesson_id UUID NOT NULL REFERENCES live_lessons(id) ON DELETE CASCADE,
            kind VARCHAR(20) NOT NULL DEFAULT 'board',
            scene JSONB NOT NULL DEFAULT '{}'::jsonb,
            version INTEGER NOT NULL DEFAULT 0,
            material_ref VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_lesson_boards_lesson ON lesson_boards (live_lesson_id)"
    )
    op.execute("""
        CREATE TABLE IF NOT EXISTS exercise_drafts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
            student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            answers JSONB,
            source_code TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_exercise_drafts_ex_student UNIQUE (exercise_id, student_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_exercise_drafts_org_id ON exercise_drafts (org_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS exercise_drafts")
    op.execute("DROP TABLE IF EXISTS lesson_boards")
    op.execute("DROP TABLE IF EXISTS live_lessons")
