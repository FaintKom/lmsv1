import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

# Import all models so Alembic can detect them — keep in sync with
# tests/conftest.py. A module missing here is INVISIBLE to autogenerate
# (its FKs also break `alembic check` with NoReferencedTableError).
import app.admin.models  # noqa: F401
import app.analytics.models  # noqa: F401
import app.assessments.models  # noqa: F401
import app.assignments.models  # noqa: F401
import app.attendance.models  # noqa: F401
import app.auth.models  # noqa: F401
import app.billing.models  # noqa: F401
import app.calendar.models  # noqa: F401
import app.certificates.models  # noqa: F401
import app.courses.models  # noqa: F401
import app.curriculum.models  # noqa: F401
import app.donations.models  # noqa: F401
import app.exercises.models  # noqa: F401
import app.feedback.models  # noqa: F401
import app.gamification.models  # noqa: F401
import app.integrations.models  # noqa: F401
import app.journal.models  # noqa: F401
import app.knowledge.models  # noqa: F401
import app.learning_paths.models  # noqa: F401
import app.live_lessons.models  # noqa: F401
import app.meetings.models  # noqa: F401
import app.metered_billing.models  # noqa: F401
import app.notifications.models  # noqa: F401
import app.peer_review.models  # noqa: F401
import app.progress.models  # noqa: F401
import app.recording.models  # noqa: F401
import app.rooms.models  # noqa: F401
import app.sandbox.models  # noqa: F401
import app.schedule.models  # noqa: F401
import app.scorm.models  # noqa: F401
import app.scorm_import.models  # noqa: F401
import app.sites.models  # noqa: F401
import app.skills.models  # noqa: F401
import app.submissions.models  # noqa: F401
import app.team_projects.models  # noqa: F401
import app.waitlist.models  # noqa: F401
import app.webhooks.models  # noqa: F401
from alembic import context
from app.config import settings
from app.db.base import Base

config = context.config
config.set_main_option("sqlalchemy.url", settings.get_database_url())

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
