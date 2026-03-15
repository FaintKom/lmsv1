"""fix course/lesson FK cascades for course deletion

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-03-16 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (table, constraint_name, column, referenced_table)
FK_CHANGES = [
    # FK to courses.id
    ("enrollments", "enrollments_course_id_fkey", "course_id", "courses.id"),
    ("learning_path_steps", "learning_path_steps_course_id_fkey", "course_id", "courses.id"),
    # FK to lessons.id
    ("quizzes", "quizzes_lesson_id_fkey", "lesson_id", "lessons.id"),
    ("code_challenges", "code_challenges_lesson_id_fkey", "lesson_id", "lessons.id"),
    ("file_submissions", "file_submissions_lesson_id_fkey", "lesson_id", "lessons.id"),
    ("interactive_submissions", "interactive_submissions_lesson_id_fkey", "lesson_id", "lessons.id"),
    ("lesson_progress", "lesson_progress_lesson_id_fkey", "lesson_id", "lessons.id"),
    # FK to quizzes.id
    ("quiz_submissions", "quiz_submissions_quiz_id_fkey", "quiz_id", "quizzes.id"),
    # FK to code_challenges.id
    ("code_submissions", "code_submissions_challenge_id_fkey", "challenge_id", "code_challenges.id"),
]


def upgrade() -> None:
    for table, constraint, column, ref_table in FK_CHANGES:
        op.drop_constraint(constraint, table, type_="foreignkey")
        op.create_foreign_key(
            constraint, table, ref_table.split(".")[0], [column], ["id"], ondelete="CASCADE"
        )


def downgrade() -> None:
    for table, constraint, column, ref_table in FK_CHANGES:
        op.drop_constraint(constraint, table, type_="foreignkey")
        op.create_foreign_key(
            constraint, table, ref_table.split(".")[0], [column], ["id"]
        )
