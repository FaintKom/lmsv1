"""fix user fk cascades for gdpr right to erasure

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-03-15 20:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# CASCADE: student-owned data
CASCADE_FKS = [
    ("quiz_submissions", "student_id", "quiz_submissions_student_id_fkey"),
    ("assignment_submissions", "student_id", "assignment_submissions_student_id_fkey"),
    ("learning_path_enrollments", "student_id", "learning_path_enrollments_student_id_fkey"),
    ("enrollments", "student_id", "enrollments_student_id_fkey"),
    ("code_submissions", "student_id", "code_submissions_student_id_fkey"),
    ("file_submissions", "student_id", "file_submissions_student_id_fkey"),
    ("interactive_submissions", "student_id", "interactive_submissions_student_id_fkey"),
]

# SET NULL: creator/teacher references
SET_NULL_FKS = [
    ("courses", "teacher_id", "courses_teacher_id_fkey"),
    ("assignments", "created_by", "assignments_created_by_fkey"),
    ("assignment_submissions", "graded_by", "assignment_submissions_graded_by_fkey"),
    ("calendar_events", "created_by", "calendar_events_created_by_fkey"),
    ("learning_paths", "created_by", "learning_paths_created_by_fkey"),
    ("meetings", "created_by", "meetings_created_by_fkey"),
]

# Columns that need to become nullable for SET NULL
MAKE_NULLABLE = [
    ("courses", "teacher_id"),
    ("assignments", "created_by"),
    ("calendar_events", "created_by"),
    ("learning_paths", "created_by"),
    ("meetings", "created_by"),
]


def upgrade() -> None:
    # CASCADE FKs
    for table, column, constraint in CASCADE_FKS:
        op.drop_constraint(constraint, table, type_="foreignkey")
        op.create_foreign_key(constraint, table, "users", [column], ["id"], ondelete="CASCADE")

    # Make columns nullable before adding SET NULL
    for table, column in MAKE_NULLABLE:
        op.alter_column(table, column, nullable=True)

    # SET NULL FKs
    for table, column, constraint in SET_NULL_FKS:
        op.drop_constraint(constraint, table, type_="foreignkey")
        op.create_foreign_key(constraint, table, "users", [column], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    # Revert SET NULL FKs
    for table, column, constraint in SET_NULL_FKS:
        op.drop_constraint(constraint, table, type_="foreignkey")
        op.create_foreign_key(constraint, table, "users", [column], ["id"])

    # Revert nullable
    for table, column in MAKE_NULLABLE:
        op.alter_column(table, column, nullable=False)

    # Revert CASCADE FKs
    for table, column, constraint in CASCADE_FKS:
        op.drop_constraint(constraint, table, type_="foreignkey")
        op.create_foreign_key(constraint, table, "users", [column], ["id"])
