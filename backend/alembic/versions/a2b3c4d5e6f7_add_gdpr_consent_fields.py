"""add gdpr consent fields to users

Revision ID: a2b3c4d5e6f7
Revises: 1df0cb77550c
Create Date: 2026-03-15 20:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = '1df0cb77550c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('consent_accepted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('privacy_policy_version', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'privacy_policy_version')
    op.drop_column('users', 'consent_accepted_at')
