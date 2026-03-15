"""add assignments learning_paths password_reset email_prefs

Revision ID: 1df0cb77550c
Revises:
Create Date: 2026-03-15 17:30:39.897850
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1df0cb77550c'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email_preferences JSONB column to users table
    op.add_column('users', sa.Column(
        'email_preferences',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        server_default='{"assignments": true, "grades": true, "deadlines": true, "courses": true}',
    ))


def downgrade() -> None:
    op.drop_column('users', 'email_preferences')
