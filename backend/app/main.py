import asyncio
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.auth.router import router as auth_router
from app.courses.router import router as courses_router
from app.assessments.router import router as assessments_router
from app.progress.router import router as progress_router
from app.sandbox.router import router as sandbox_router
from app.billing.router import router as billing_router
from app.admin.router import router as admin_router
from app.submissions.router import router as submissions_router
from app.discussions.router import router as discussions_router
from app.notifications.router import router as notifications_router
from app.gamification.router import router as gamification_router
from app.certificates.router import router as certificates_router
from app.math_problems.router import router as math_problems_router
from app.assignments.router import router as assignments_router
from app.learning_paths.router import router as learning_paths_router
from app.calendar.router import router as calendar_router
from app.meetings.router import router as meetings_router
from app.parent.router import router as parent_router
from app.skills.router import router as skills_router
from app.recommendations.router import router as recommendations_router
from app.exercises.router import router as exercises_router
from app.ai.router import router as ai_router

logger = logging.getLogger(__name__)


class StartupState:
    """Tracks whether background DB setup has completed."""
    def __init__(self):
        self.ready = False
        self.error: str | None = None

startup_state = StartupState()


async def _run_migrations():
    """Heavy DB setup that runs in the background after the app starts serving."""
    try:
        from app.db.base import Base
        from app.db.session import engine
        from sqlalchemy import text as sa_text

        t0 = time.monotonic()

        # Add new enum values to PostgreSQL (each ADD VALUE needs its own transaction)
        for enum_type, val in [
            ("contenttype", "file_upload"),
            ("contenttype", "interactive"),
            ("userrole", "super_admin"),
            ("userrole", "parent"),
            ("exercisetype", "quiz"),
            ("exercisetype", "code_challenge"),
            ("exercisetype", "matching"),
            ("exercisetype", "ordering"),
            ("exercisetype", "fill_blanks"),
            ("exercisetype", "true_false"),
            ("exercisetype", "categorize"),
            ("exercisetype", "file_upload"),
        ]:
            try:
                async with engine.connect() as conn:
                    await conn.execute(sa_text(
                        f"ALTER TYPE {enum_type} ADD VALUE IF NOT EXISTS '{val}'"
                    ))
                    await conn.commit()
            except Exception:
                pass

        # Create/verify all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info(f"Tables created/verified in {time.monotonic() - t0:.1f}s")

        # Add missing columns to existing tables (create_all doesn't alter tables)
        alter_statements = [
            "ALTER TABLE user_streaks ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0",
            "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS progress_percent NUMERIC DEFAULT 0",
            # Remove duplicate plans before adding unique constraint
            """DELETE FROM plans WHERE id NOT IN (
                SELECT DISTINCT ON (name) id FROM plans ORDER BY name, created_at ASC NULLS LAST, id ASC
            )""",
            "ALTER TABLE plans DROP CONSTRAINT IF EXISTS uq_plans_name",
            "ALTER TABLE plans ADD CONSTRAINT uq_plans_name UNIQUE (name)",
            # Methodist & template courses
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_methodist BOOLEAN DEFAULT FALSE",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS source_course_id UUID REFERENCES courses(id) ON DELETE SET NULL",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS template_version INTEGER DEFAULT 1",
        ]
        for stmt in alter_statements:
            try:
                async with engine.connect() as conn:
                    await conn.execute(sa_text(stmt))
                    await conn.commit()
            except Exception:
                pass

        # Add new enum values (must run outside transaction)
        enum_additions = [
            "ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'robot_2d'",
            "ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'math_interactive'",
            "ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'world_3d'",
            "ALTER TYPE contenttype ADD VALUE IF NOT EXISTS 'robot_2d'",
            "ALTER TYPE contenttype ADD VALUE IF NOT EXISTS 'math_interactive'",
            "ALTER TYPE contenttype ADD VALUE IF NOT EXISTS 'world_3d'",
        ]
        for stmt in enum_additions:
            try:
                async with engine.connect() as conn:
                    await conn.execution_options(isolation_level="AUTOCOMMIT")
                    await conn.execute(sa_text(stmt))
            except Exception:
                pass

        # Try Alembic migrations if available
        try:
            from alembic.config import Config
            from alembic import command

            alembic_cfg = Config("alembic.ini")
            command.upgrade(alembic_cfg, "head")
            logger.info("Database migrations applied successfully")
        except Exception as e:
            logger.debug(f"Alembic migrations skipped: {e}")

        # Ensure super_admin user exists (only if credentials are configured via env)
        sa_email = (settings.super_admin_email or "").strip().lower()
        sa_password = settings.super_admin_password or ""
        if not sa_email or not sa_password:
            if settings.is_production():
                logger.warning(
                    "SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set; skipping "
                    "super admin bootstrap. Set both in the environment to create one."
                )
            else:
                logger.info(
                    "Super admin bootstrap skipped (SUPER_ADMIN_EMAIL / "
                    "SUPER_ADMIN_PASSWORD not set)."
                )
        else:
            try:
                from app.db.session import async_session_factory
                from app.auth.models import User, UserRole, Organization
                from app.auth.security import hash_password
                from sqlalchemy import select

                async with async_session_factory() as session:
                    result = await session.execute(
                        select(User).where(User.email == sa_email)
                    )
                    sa_user = result.scalar_one_or_none()
                    if not sa_user:
                        # Create system org
                        result = await session.execute(
                            select(Organization).where(Organization.slug == "system")
                        )
                        sys_org = result.scalar_one_or_none()
                        if not sys_org:
                            sys_org = Organization(name="System", slug="system")
                            session.add(sys_org)
                            await session.flush()

                        sa_user = User(
                            org_id=sys_org.id,
                            email=sa_email,
                            hashed_password=hash_password(sa_password),
                            full_name="Super Admin",
                            role=UserRole.super_admin,
                        )
                        session.add(sa_user)
                        await session.commit()
                        logger.info("Super admin user created from env configuration")
                    elif sa_user.role != UserRole.super_admin:
                        sa_user.role = UserRole.super_admin
                        await session.commit()
                        logger.info("Super admin role updated")
            except Exception as e:
                logger.warning(f"Super admin setup: {e}")

        # Seed default billing plans
        try:
            from app.db.session import async_session_factory
            from app.billing.service import seed_default_plans
            async with async_session_factory() as session:
                await seed_default_plans(session)
                await session.commit()
                logger.info("Default billing plans seeded")
        except Exception as e:
            logger.debug(f"Plan seeding: {e}")

        startup_state.ready = True
        logger.info(f"Background startup completed in {time.monotonic() - t0:.1f}s")

    except Exception as e:
        startup_state.error = str(e)
        logger.error(f"Background startup failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    startup_start = time.monotonic()

    # Production configuration validation — refuse to start with unsafe defaults.
    config_errors = settings.validate_production()
    if config_errors:
        if settings.is_production():
            for err in config_errors:
                logger.error(f"Production config error: {err}")
            raise RuntimeError(
                "Refusing to start in production with invalid configuration. "
                "Fix the errors above and restart. See .env.example for guidance."
            )
        else:
            for err in config_errors:
                logger.warning(f"Config warning (non-production): {err}")

    # Import all models so they register with Base metadata
    import app.auth.models  # noqa
    import app.courses.models  # noqa
    import app.assessments.models  # noqa
    import app.progress.models  # noqa
    import app.billing.models  # noqa
    import app.sandbox.models  # noqa
    import app.submissions.models  # noqa
    import app.discussions.models  # noqa
    import app.notifications.models  # noqa
    import app.gamification.models  # noqa
    import app.certificates.models  # noqa
    import app.admin.models  # noqa
    import app.assignments.models  # noqa
    import app.learning_paths.models  # noqa
    import app.calendar.models  # noqa
    import app.meetings.models  # noqa
    import app.skills.models  # noqa
    import app.exercises.models  # noqa

    # Phase 1: Quick DB connectivity check — just verify we CAN connect
    from app.db.session import engine
    from sqlalchemy import text as sa_text

    for attempt in range(3):
        try:
            async with engine.connect() as conn:
                await conn.execute(sa_text("SELECT 1"))
            logger.info(f"DB connected in {time.monotonic() - startup_start:.1f}s")
            break
        except Exception as e:
            if attempt < 2:
                logger.warning(f"DB not ready (attempt {attempt + 1}/3): {e}")
                await asyncio.sleep(2)
            else:
                logger.error(f"DB unreachable after 3 attempts: {e}")
                startup_state.error = "Database unavailable"

    # Phase 2: Kick off heavy setup in background — app starts serving NOW
    task = asyncio.create_task(_run_migrations())
    logger.info(f"App accepting requests in {time.monotonic() - startup_start:.1f}s (migrations running in background)")

    yield

    # Shutdown
    task.cancel()
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="LearnHub API",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        redirect_slashes=True,
        lifespan=lifespan,
    )

    # Rate limiter — attached to app state so slowapi can find it in decorators.
    from slowapi.errors import RateLimitExceeded
    from slowapi import _rate_limit_exceeded_handler
    from app.common.rate_limit import limiter

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    import traceback

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    @app.middleware("http")
    async def startup_gate(request: Request, call_next):
        """Return 503 for API requests while background migrations are running."""
        path = request.scope["path"]
        # Always let health check, docs, and openapi through
        if path in ("/health", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)
        # Gate API requests until migrations complete
        if path.startswith("/api/") and not startup_state.ready:
            return JSONResponse(
                status_code=503,
                content={"detail": "Server is starting up, please retry in a few seconds"},
                headers={"Retry-After": "5"},
            )
        return await call_next(request)

    @app.middleware("http")
    async def strip_trailing_slash(request, call_next):
        """Strip trailing slashes so both /path and /path/ work without 307 redirects."""
        path = request.scope["path"]
        if path != "/" and path.endswith("/"):
            request.scope["path"] = path.rstrip("/")
        return await call_next(request)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
    app.include_router(courses_router, prefix="/api/v1/courses", tags=["Courses"])
    app.include_router(assessments_router, prefix="/api/v1/assessments", tags=["Assessments"])
    app.include_router(progress_router, prefix="/api/v1/progress", tags=["Progress"])
    app.include_router(sandbox_router, prefix="/api/v1/sandbox", tags=["Sandbox"])
    app.include_router(billing_router, prefix="/api/v1/billing", tags=["Billing"])
    app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
    app.include_router(submissions_router, prefix="/api/v1/submissions", tags=["Submissions"])
    app.include_router(discussions_router, prefix="/api/v1/discussions", tags=["Discussions"])
    app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["Notifications"])
    app.include_router(gamification_router, prefix="/api/v1/gamification", tags=["Gamification"])
    app.include_router(certificates_router, prefix="/api/v1/certificates", tags=["Certificates"])
    app.include_router(math_problems_router, prefix="/api/v1/math-problems", tags=["Math Problems"])
    app.include_router(assignments_router, prefix="/api/v1/assignments", tags=["Assignments"])
    app.include_router(learning_paths_router, prefix="/api/v1/learning-paths", tags=["Learning Paths"])
    app.include_router(calendar_router, prefix="/api/v1/calendar", tags=["Calendar"])
    app.include_router(meetings_router, prefix="/api/v1/meetings", tags=["Meetings"])
    app.include_router(parent_router, prefix="/api/v1/parent", tags=["Parent"])
    app.include_router(skills_router, prefix="/api/v1/skills", tags=["Skills"])
    app.include_router(recommendations_router, prefix="/api/v1/recommendations", tags=["Recommendations"])
    app.include_router(exercises_router, prefix="/api/v1/exercises", tags=["Exercises"])
    app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI Tutor"])

    @app.get("/health")
    async def health():
        return {
            "status": "ok",
            "ready": startup_state.ready,
            "error": startup_state.error,
        }

    return app


app = create_app()
