"""add content_feedback table

Backs the lesson + content-unit feedback system. One table, two
``kind`` values:

  - ``lesson_rating``: 1–5 stars + optional comment, one per
    (user, lesson). Enforced with a partial unique index.
  - ``block_issue``:  category + comment flagged on a soft-referenced
    content block inside a lesson's JSON content.

Indexes:
  - (org_id, status, created_at desc)  — admin inbox feed
  - (lesson_id, status)                — open-issues badge on lesson card
  - partial UNIQUE (user_id, lesson_id) WHERE kind='lesson_rating'
                                       — UPSERT on re-rating

Idempotent: ``IF NOT EXISTS`` so re-runs via ``_run_setup`` are safe.
"""

from typing import Sequence, Union

import sqlalchemy as sa  # noqa: F401 — kept for Alembic stub compat

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "v0w1x2y3z4a5"
down_revision: Union[str, None] = "u9v0w1x2y3z4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS content_feedback (
            id              UUID PRIMARY KEY,
            org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            lesson_id       UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
            block_id        VARCHAR(64),
            block_type      VARCHAR(16),
            kind            VARCHAR(20) NOT NULL,
            rating          INTEGER,
            category        VARCHAR(20),
            comment         TEXT,
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status          VARCHAR(20) NOT NULL DEFAULT 'open',
            resolved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
            resolved_at     TIMESTAMPTZ,
            resolver_note   TEXT,
            xp_awarded      BOOLEAN NOT NULL DEFAULT FALSE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_content_feedback_org_status_created
            ON content_feedback (org_id, status, created_at DESC);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_content_feedback_lesson_status
            ON content_feedback (lesson_id, status);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_content_feedback_user
            ON content_feedback (user_id);
    """)

    # Partial unique: at most one lesson_rating per (user, lesson).
    # Re-rating UPSERTs into this row. Block-issue rows are exempt
    # so a student can flag multiple blocks per lesson.
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ux_content_feedback_one_lesson_rating
            ON content_feedback (user_id, lesson_id)
            WHERE kind = 'lesson_rating';
    """)

    # CHECK constraint guarded so re-running the migration on a populated
    # DB (via _run_setup() fallback in main.py) doesn't 42P07 the world.
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'ck_content_feedback_rating_range'
            ) THEN
                ALTER TABLE content_feedback
                ADD CONSTRAINT ck_content_feedback_rating_range
                CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));
            END IF;
        END $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS content_feedback;")
