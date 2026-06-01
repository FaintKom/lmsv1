"""curriculum scope & sequence + session topic links (Phase C)

Adds the course-level program (``curriculum_topics``) and links each
``class_sessions`` row to the topic it actually covered + the planned snapshot,
**additively and prod-safe**:

  * ``curriculum_topics`` — one ordered topic per course
    (``course_id`` CASCADE, ``position``, ``title``, ``planned_lessons`` default
    1, optional ``target_date``), indexed on ``(course_id, position)``.
  * ``class_sessions.actual_topic_id`` / ``planned_topic_id`` — optional FKs to
    ``curriculum_topics`` (ON DELETE SET NULL), so deleting a topic never
    orphans a session.

Idempotent: ``CREATE TABLE IF NOT EXISTS`` / ``ADD COLUMN IF NOT EXISTS`` /
``CREATE INDEX IF NOT EXISTS`` so it is safe to re-run via the ``_run_setup``
boot-time fallback in main.py.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "cur1c0lum01"
down_revision: Union[str, None] = "gr0up5ched1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS curriculum_topics (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            position integer NOT NULL DEFAULT 1,
            title varchar(300) NOT NULL DEFAULT '',
            planned_lessons integer NOT NULL DEFAULT 1,
            target_date date,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_curriculum_topics_course_position "
        "ON curriculum_topics (course_id, position)"
    )
    op.execute(
        "ALTER TABLE class_sessions "
        "ADD COLUMN IF NOT EXISTS actual_topic_id uuid "
        "REFERENCES curriculum_topics(id) ON DELETE SET NULL"
    )
    op.execute(
        "ALTER TABLE class_sessions "
        "ADD COLUMN IF NOT EXISTS planned_topic_id uuid "
        "REFERENCES curriculum_topics(id) ON DELETE SET NULL"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_class_sessions_actual_topic_id "
        "ON class_sessions (actual_topic_id)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_class_sessions_actual_topic_id")
    op.execute("ALTER TABLE class_sessions DROP COLUMN IF EXISTS planned_topic_id")
    op.execute("ALTER TABLE class_sessions DROP COLUMN IF EXISTS actual_topic_id")
    op.execute("DROP INDEX IF EXISTS ix_curriculum_topics_course_position")
    op.execute("DROP TABLE IF EXISTS curriculum_topics")
