"""group-centric scheduling (Phase B)

Extends :class:`StudentGroup` into the design's *group* — a cohort of students
studying one course — and links the timetable + journal to a group, **additively
and prod-safe**:

  * ``student_groups`` gains ``course_id`` / ``teacher_id`` / ``default_room_id``
    (all nullable FKs, ON DELETE SET NULL), a ``status`` (planned|active|archived,
    default ``active``) and ``start_date`` / ``end_date``.
  * ``schedule_slots.group_id`` and ``class_sessions.group_id`` — optional FK to
    ``student_groups`` (ON DELETE SET NULL). The existing ``course_id`` columns are
    KEPT (never dropped), so the live course-keyed journal/schedule keeps working;
    ``group_id`` is the new optional path.

Idempotent: every statement is ``ADD COLUMN IF NOT EXISTS`` / ``CREATE INDEX IF
NOT EXISTS`` so it is safe to re-run via the ``_run_setup`` boot-time fallback in
main.py. The one-time data backfill (default group per course + member backfill
from enrollment) is re-entrant and runs from ``_run_setup`` on every boot, so it
is intentionally NOT duplicated here.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "gr0up5ched1"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE student_groups "
        "ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id) ON DELETE SET NULL"
    )
    op.execute(
        "ALTER TABLE student_groups "
        "ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES users(id) ON DELETE SET NULL"
    )
    op.execute(
        "ALTER TABLE student_groups "
        "ADD COLUMN IF NOT EXISTS default_room_id uuid REFERENCES rooms(id) ON DELETE SET NULL"
    )
    op.execute(
        "ALTER TABLE student_groups "
        "ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'active'"
    )
    op.execute("ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS start_date date")
    op.execute("ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS end_date date")
    op.execute(
        "ALTER TABLE schedule_slots "
        "ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES student_groups(id) ON DELETE SET NULL"
    )
    op.execute(
        "ALTER TABLE class_sessions "
        "ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES student_groups(id) ON DELETE SET NULL"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_student_groups_course ON student_groups (course_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_schedule_slots_group ON schedule_slots (group_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_class_sessions_group_id ON class_sessions (group_id)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_class_sessions_group_id")
    op.execute("DROP INDEX IF EXISTS ix_schedule_slots_group")
    op.execute("DROP INDEX IF EXISTS ix_student_groups_course")
    op.execute("ALTER TABLE class_sessions DROP COLUMN IF EXISTS group_id")
    op.execute("ALTER TABLE schedule_slots DROP COLUMN IF EXISTS group_id")
    op.execute("ALTER TABLE student_groups DROP COLUMN IF EXISTS end_date")
    op.execute("ALTER TABLE student_groups DROP COLUMN IF EXISTS start_date")
    op.execute("ALTER TABLE student_groups DROP COLUMN IF EXISTS status")
    op.execute("ALTER TABLE student_groups DROP COLUMN IF EXISTS default_room_id")
    op.execute("ALTER TABLE student_groups DROP COLUMN IF EXISTS teacher_id")
    op.execute("ALTER TABLE student_groups DROP COLUMN IF EXISTS course_id")
