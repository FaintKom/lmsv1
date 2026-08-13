"""add math_system exercise type

Systems of linear equations. The value has to reach the enum before any
exercise can carry the type, and PostgreSQL only grows enums — see
docs/MIGRATIONS.md.

Revision ID: d4e5f6a7b8c9
Revises: c7d8e9f0a1b2
Create Date: 2026-08-13 13:05:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block, so
    # IF NOT EXISTS keeps it idempotent across a retried deploy.
    # exercisetype only. ContentType (app/courses/models.py) stopped tracking
    # exercise types after the 2026-03 game batch — scorm_package, web_editor
    # and math_stepwise are all absent from it — so adding the value there
    # would put a name in the database enum that no Python enum has.
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'math_system'")


def downgrade() -> None:
    # PostgreSQL has no DROP VALUE. Removing it would mean rebuilding the enum
    # and rewriting every row that references it — destructive, and pointless
    # for a value that is simply unused after a rollback.
    pass
