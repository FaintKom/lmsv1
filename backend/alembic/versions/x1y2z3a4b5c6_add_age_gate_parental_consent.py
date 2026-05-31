"""add age gate + verifiable parental consent

Revision ID: x1y2z3a4b5c6
Revises: f4a5b6c7d8e9
Create Date: 2026-05-31

Age gate / verifiable parental consent (GDPR Art. 8). Adds:
  - users.date_of_birth (DATE, nullable) — self-reported DOB for NEW student
    registrations so minors can be routed through verifiable parental consent.
    NULL for all pre-existing rows; treated as adult/unknown (never locked out).
  - parent_consent_tokens — single-hop email-confirmation tokens issued when a
    minor registers; clicking the emailed link records consent + activates the
    child account.

Rerun-safe (IF NOT EXISTS) because `_run_setup` in app/main.py re-applies the
same DDL on every boot as a fallback.

This is a STARTING implementation of verifiable consent, not a legal-compliance
guarantee — have a lawyer review the required verification strength.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "x1y2z3a4b5c6"
down_revision: Union[str, None] = "f4a5b6c7d8e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS parent_consent_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            parent_email VARCHAR(255) NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used BOOLEAN NOT NULL DEFAULT FALSE,
            confirmed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_parent_consent_tokens_user_id "
        "ON parent_consent_tokens (user_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_parent_consent_tokens_token "
        "ON parent_consent_tokens (token)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS parent_consent_tokens")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS date_of_birth")
