"""add imported_scorm_packages and xapi_statements tables

Revision ID: o3p4q5r6s7t8
Revises: n2p3q4r5s6t7
Create Date: 2026-05-13

Tables backing the SCORM/xAPI import feature (F2 of the 2026-05-13
feature push). Idempotent via IF NOT EXISTS so re-running on a half-
applied DB (e.g. after a failed deploy) is safe.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "o3p4q5r6s7t8"
down_revision: Union[str, None] = "n2p3q4r5s6t7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'importedscormformat') THEN
                CREATE TYPE importedscormformat AS ENUM ('scorm12','scorm2004','xapi','aicc');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'importedscormstatus') THEN
                CREATE TYPE importedscormstatus AS ENUM ('pending','extracted','failed');
            END IF;
        END $$;
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS imported_scorm_packages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
            uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
            original_filename VARCHAR(500),
            format importedscormformat NOT NULL DEFAULT 'scorm12',
            launch_url VARCHAR(1000),
            status importedscormstatus NOT NULL DEFAULT 'pending',
            title VARCHAR(500),
            manifest JSONB,
            error TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_imported_scorm_packages_org "
        "ON imported_scorm_packages(org_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_imported_scorm_packages_exercise "
        "ON imported_scorm_packages(exercise_id);"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS xapi_statements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
            verb_id VARCHAR(500) NOT NULL,
            object_id VARCHAR(500) NOT NULL,
            object_type VARCHAR(100),
            statement JSONB NOT NULL,
            result JSONB,
            context JSONB,
            stored_at TIMESTAMPTZ NOT NULL,
            exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
            imported_package_id UUID REFERENCES imported_scorm_packages(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_xapi_statements_org_actor "
        "ON xapi_statements(org_id, actor_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_xapi_statements_exercise "
        "ON xapi_statements(exercise_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_xapi_statements_package "
        "ON xapi_statements(imported_package_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_xapi_statements_stored_at "
        "ON xapi_statements(stored_at DESC);"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS xapi_statements")
    op.execute("DROP TABLE IF EXISTS imported_scorm_packages")
    op.execute("DROP TYPE IF EXISTS importedscormstatus")
    op.execute("DROP TYPE IF EXISTS importedscormformat")
