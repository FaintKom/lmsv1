"""fix organization FK cascades for deletion

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-03-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (table, constraint_name, column, ref_table_col)
FK_CHANGES = [
    ("users", "users_org_id_fkey", "org_id", "organizations.id"),
    ("student_groups", "student_groups_org_id_fkey", "org_id", "organizations.id"),
    ("calendar_events", "calendar_events_org_id_fkey", "org_id", "organizations.id"),
    ("assignments", "assignments_org_id_fkey", "org_id", "organizations.id"),
    ("learning_paths", "learning_paths_org_id_fkey", "org_id", "organizations.id"),
    ("courses", "courses_org_id_fkey", "org_id", "organizations.id"),
    ("meetings", "meetings_org_id_fkey", "org_id", "organizations.id"),
    ("subscriptions", "subscriptions_org_id_fkey", "org_id", "organizations.id"),
    ("invoices", "invoices_org_id_fkey", "org_id", "organizations.id"),
    ("badges", "badges_org_id_fkey", "org_id", "organizations.id"),
    ("skills", "skills_org_id_fkey", "org_id", "organizations.id"),
]


def upgrade() -> None:
    for table, fk_name, col, ref in FK_CHANGES:
        op.drop_constraint(fk_name, table, type_="foreignkey")
        op.create_foreign_key(fk_name, table, ref.split(".")[0], [col], [ref.split(".")[1]], ondelete="CASCADE")


def downgrade() -> None:
    for table, fk_name, col, ref in FK_CHANGES:
        op.drop_constraint(fk_name, table, type_="foreignkey")
        op.create_foreign_key(fk_name, table, ref.split(".")[0], [col], [ref.split(".")[1]])
