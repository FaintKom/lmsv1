"""add listening exercise type

Revision ID: l1s2t3n4i5n6
Revises: m3nukeycl3an
Create Date: 2026-08-31

Adds one value to the `exercisetype` PG enum. Idempotent via
`ADD VALUE IF NOT EXISTS` — `_run_setup` repeats ALTERs on every start.
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "l1s2t3n4i5n6"
down_revision: Union[str, None] = "m3nukeycl3an"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'listening'")


def downgrade() -> None:
    pass
