import asyncio
import logging
import time
import uuid as _uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings

# Configure structured logging BEFORE anything else so even import-time
# messages go through the same pipeline.
from app.logging_config import configure_logging, request_id_var

configure_logging()

# Initialize Sentry BEFORE importing routers so the SDK can patch modules.
# Empty DSN disables Sentry entirely — no network calls, no overhead.
if settings.sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            send_default_pii=False,  # do not send user identifiers in events
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                StarletteIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
        )
    except Exception as e:
        logging.getLogger(__name__).warning(f"Sentry init failed: {e}")
from app.admin.router import router as admin_router
from app.analytics.router import router as analytics_router
from app.analytics.task_stats_router import router as task_stats_router
from app.assessments.router import router as assessments_router
from app.assignments.router import router as assignments_router
from app.attendance.router import router as attendance_router
from app.auth.router import router as auth_router
from app.billing.router import router as billing_router
from app.calendar.router import router as calendar_router
from app.certificates.router import router as certificates_router
from app.courses.router import router as courses_router
from app.donations.router import router as donations_router
from app.exercises.router import router as exercises_router
from app.export.router import router as export_router
from app.feedback.router import router as feedback_router
from app.gamification.router import router as gamification_router
from app.integrations.router import router as integrations_router
from app.learning_paths.router import router as learning_paths_router
from app.math_problems.router import router as math_problems_router
from app.math_validation.router import router as math_validation_router
from app.meetings.router import router as meetings_router
from app.metered_billing.router import router as metered_billing_router
from app.notifications.router import router as notifications_router
from app.orgs.router import router as orgs_router
from app.parent.router import router as parent_router
from app.peer_review.router import router as peer_review_router
from app.progress.router import router as progress_router
from app.recommendations.router import router as recommendations_router
from app.recording.router import router as recording_router
from app.sandbox.router import router as sandbox_router
from app.scorm.router import router as scorm_router
from app.scorm_import.router import router as scorm_import_router
from app.skills.router import router as skills_router
from app.submissions.router import router as submissions_router
from app.team_projects.router import router as team_projects_router
from app.waitlist.router import router as waitlist_router
from app.webhooks.router import router as webhooks_router

logger = logging.getLogger(__name__)


class StartupState:
    """Tracks whether background DB setup has completed."""
    def __init__(self):
        self.ready = False
        self.error: str | None = None

startup_state = StartupState()


async def _run_setup():
    """Blocking DB setup that runs during lifespan startup BEFORE the app
    accepts any requests. Creates tables, adds missing columns, seeds default
    plans, and bootstraps the super admin if configured. Raises on failure in
    production so the container exits and the orchestrator restarts it.
    """
    try:
        from sqlalchemy import text as sa_text

        from app.db.base import Base
        from app.db.session import engine

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
            # P0-6: email verification
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE",
            # Child safety: school-mediated parental consent + retention tracking
            # (migration c1d2e3f4a5b6). Mirrored here as boot-time fallback.
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS parental_consent_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS parental_consent_by UUID",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE",
            # Age gate + verifiable parental consent (migration x1y2z3a4b5c6).
            # date_of_birth is NULL for existing rows (treated as adult/unknown,
            # never locked out). The parent_consent_tokens table itself is created
            # by Base.metadata.create_all from the model import below.
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE",
            # Phase 1 task statistics for methodists: per-attempt time-on-task +
            # attempt number on exercise submissions (migration e3f4a5b6c7d8).
            "ALTER TABLE exercise_submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE exercise_submissions ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER",
            "ALTER TABLE exercise_submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER",
            # Phase 2 task statistics: same time-on-task columns on quiz +
            # assignment submissions, plus (task_id, student_id) indexes powering
            # the task-stats aggregates (migration f4a5b6c7d8e9).
            "ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER",
            "ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER",
            "ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER",
            "ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER",
            "CREATE INDEX IF NOT EXISTS ix_quiz_submissions_quiz_student ON quiz_submissions (quiz_id, student_id)",
            "CREATE INDEX IF NOT EXISTS ix_assignment_submissions_assignment_student ON assignment_submissions (assignment_id, student_id)",
            # P2-11: backfill organization_memberships for existing users
            # who predate the multi-org feature. One row per user mirroring
            # their primary org + role. Safe to re-run (ON CONFLICT DO NOTHING).
            """INSERT INTO organization_memberships (id, user_id, org_id, role, created_at, updated_at)
               SELECT gen_random_uuid(), u.id, u.org_id, u.role, NOW(), NOW()
               FROM users u
               WHERE NOT EXISTS (
                   SELECT 1 FROM organization_memberships m
                   WHERE m.user_id = u.id AND m.org_id = u.org_id
               )""",
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
            "ALTER TYPE contenttype ADD VALUE IF NOT EXISTS 'theory'",
        ]
        for stmt in enum_additions:
            try:
                async with engine.connect() as conn:
                    await conn.execution_options(isolation_level="AUTOCOMMIT")
                    await conn.execute(sa_text(stmt))
            except Exception:
                pass

        # Alembic migrations are NOT run here — the sync `command.upgrade`
        # path cannot be called from inside an already-running event loop
        # (asyncio.run() inside asyncio loop is disallowed and logs the
        # 'coroutine was never awaited' warning we were seeing). Schema
        # additions go through Base.metadata.create_all above plus the
        # ALTER TABLE IF NOT EXISTS statements below. Real alembic migration
        # via async engine is a P1 follow-up.

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
                from sqlalchemy import select

                from app.auth.models import Organization, User, UserRole
                from app.auth.security import hash_password
                from app.db.session import async_session_factory

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
            from app.billing.service import seed_default_plans
            from app.db.session import async_session_factory
            async with async_session_factory() as session:
                await seed_default_plans(session)
                await session.commit()
                logger.info("Default billing plans seeded")
        except Exception as e:
            logger.debug(f"Plan seeding: {e}")

        startup_state.ready = True
        logger.info(f"DB setup completed in {time.monotonic() - t0:.1f}s")

    except Exception as e:
        startup_state.error = str(e)
        logger.error(f"DB setup failed: {e}")
        # Re-raise so the lifespan caller can decide whether to abort startup.
        raise


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
    import app.waitlist.models  # noqa
    import app.webhooks.models  # noqa
    import app.attendance.models  # noqa
    import app.scorm.models  # noqa
    import app.scorm_import.models  # noqa
    import app.peer_review.models  # noqa
    import app.team_projects.models  # noqa
    import app.recording.models  # noqa
    import app.metered_billing.models  # noqa
    import app.feedback.models  # noqa
    import app.analytics.models  # noqa
    import app.donations.models  # noqa

    # Phase 1: Quick DB connectivity check — just verify we CAN connect
    from app.db.session import engine
    from sqlalchemy import text as sa_text

    db_ready = False
    for attempt in range(3):
        try:
            async with engine.connect() as conn:
                await conn.execute(sa_text("SELECT 1"))
            logger.info(f"DB connected in {time.monotonic() - startup_start:.1f}s")
            db_ready = True
            break
        except Exception as e:
            if attempt < 2:
                logger.warning(f"DB not ready (attempt {attempt + 1}/3): {e}")
                await asyncio.sleep(2)
            else:
                logger.error(f"DB unreachable after 3 attempts: {e}")
                startup_state.error = "Database unavailable"

    if not db_ready:
        # In production we bail out so the orchestrator restarts us with
        # fresh backoff. In dev we keep running so the developer can see
        # the error in the logs and fix it without a restart loop.
        if settings.is_production():
            raise RuntimeError("Database unavailable after 3 attempts, aborting startup")

    # Phase 2: Run DB setup synchronously BEFORE the app accepts requests.
    # This avoids race conditions on multi-instance deploys and makes setup
    # failures visible as container exit codes instead of silent 503s.
    if db_ready:
        try:
            await _run_setup()
        except Exception as e:
            if settings.is_production():
                # Re-raise so the lifespan aborts and the container exits
                raise
            logger.warning(f"DB setup had errors (continuing in non-production): {e}")

    # Phase 3: Start the in-process cron scheduler (APScheduler).
    # Only after DB setup is done, so jobs that need DB can run safely.
    from app.scheduler import start_scheduler, stop_scheduler
    if db_ready:
        try:
            start_scheduler()
        except Exception as e:
            logger.warning(f"Scheduler failed to start: {e}")

    logger.info(f"App accepting requests after {time.monotonic() - startup_start:.1f}s")

    yield

    # Shutdown
    stop_scheduler()
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="GrassLMS API",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        redirect_slashes=True,
        lifespan=lifespan,
    )

    # Rate limiter — attached to app state so slowapi can find it in decorators.
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded

    from app.common.rate_limit import limiter

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    import traceback

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}\n{traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    # Startup gate middleware has been removed in P0-10 — the lifespan
    # now runs _run_setup() synchronously before yielding, so by the time
    # this process accepts any request, the DB is fully set up. If setup
    # fails in production the lifespan raises and the container exits
    # with a visible error, which is strictly better than silent 503s.

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        """Assign a unique request id to every request for log correlation.

        If the caller sends an `X-Request-ID` header we trust and propagate
        it, otherwise we generate a short random id. The id is set on a
        contextvar so every log line inside the request carries it, and
        echoed back in the response header so clients can include it in
        bug reports.
        """
        incoming = request.headers.get("x-request-id")
        rid = incoming if incoming else _uuid.uuid4().hex[:12]
        token = request_id_var.set(rid)
        try:
            response = await call_next(request)
        finally:
            request_id_var.reset(token)
        response.headers["x-request-id"] = rid
        return response

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
    app.include_router(donations_router, prefix="/api/v1/donations", tags=["Donations"])
    app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["Notifications"])
    app.include_router(orgs_router, prefix="/api/v1", tags=["Organizations"])
    app.include_router(gamification_router, prefix="/api/v1/gamification", tags=["Gamification"])
    app.include_router(feedback_router, prefix="/api/v1", tags=["Feedback"])
    app.include_router(analytics_router, prefix="/api/v1", tags=["Analytics Dashboards"])
    app.include_router(task_stats_router, prefix="/api/v1", tags=["Task Statistics"])
    app.include_router(certificates_router, prefix="/api/v1/certificates", tags=["Certificates"])
    app.include_router(math_problems_router, prefix="/api/v1/math-problems", tags=["Math Problems"])
    app.include_router(assignments_router, prefix="/api/v1/assignments", tags=["Assignments"])
    app.include_router(learning_paths_router, prefix="/api/v1/learning-paths", tags=["Learning Paths"])
    app.include_router(calendar_router, prefix="/api/v1/calendar", tags=["Calendar"])
    app.include_router(meetings_router, prefix="/api/v1/meetings", tags=["Meetings"])
    app.include_router(integrations_router, prefix="/api/v1/integrations", tags=["Integrations"])
    app.include_router(parent_router, prefix="/api/v1/parent", tags=["Parent"])
    app.include_router(skills_router, prefix="/api/v1/skills", tags=["Skills"])
    app.include_router(recommendations_router, prefix="/api/v1/recommendations", tags=["Recommendations"])
    app.include_router(exercises_router, prefix="/api/v1/exercises", tags=["Exercises"])
    app.include_router(waitlist_router, prefix="/api/v1", tags=["Waitlist"])
    app.include_router(webhooks_router, prefix="/api/v1", tags=["Webhooks"])
    app.include_router(attendance_router, prefix="/api/v1", tags=["Attendance"])
    app.include_router(scorm_router, prefix="/api/v1/admin/scorm", tags=["SCORM"])
    app.include_router(scorm_import_router, prefix="/api/v1/scorm-import", tags=["SCORM Import"])
    app.include_router(math_validation_router, prefix="/api/v1/math-validation", tags=["Math Validation"])
    app.include_router(export_router, prefix="/api/v1/courses", tags=["Course Export"])
    app.include_router(peer_review_router, prefix="/api/v1/peer-review", tags=["Peer Review"])
    app.include_router(team_projects_router, prefix="/api/v1/team-projects", tags=["Team Projects"])
    app.include_router(recording_router, prefix="/api/v1/recordings", tags=["Recordings"])
    app.include_router(metered_billing_router, prefix="/api/v1/billing", tags=["Metered Billing"])

    @app.get("/health")
    async def health():
        """Simple liveness probe — 200 if the process is alive.

        Intentionally cheap: does NOT touch the DB or any external service,
        so the orchestrator can hit this many times a second without load.
        For a detailed dependency-checking probe, use /health/ready.
        """
        try:
            from app.scheduler import _scheduler
            scheduler_running = bool(_scheduler and _scheduler.running)
            scheduler_jobs = len(_scheduler.get_jobs()) if scheduler_running else 0
        except Exception:
            scheduler_running = False
            scheduler_jobs = 0

        return {
            "status": "ok",
            "ready": startup_state.ready,
            "error": startup_state.error,
            "scheduler": {
                "running": scheduler_running,
                "jobs": scheduler_jobs,
            },
        }

    @app.get("/health/live")
    async def health_live():
        """Kubernetes-style liveness probe — always returns 200 if the
        process can handle requests at all. Use this to decide whether
        to restart the container."""
        return {"status": "alive"}

    @app.get("/health/ready")
    async def health_ready():
        """Readiness probe with dependency checks.

        Returns 503 with `status: "not_ready"` if any required dependency
        (database, scheduler) is unhealthy. Returns 200 with full detail
        otherwise. Optional dependencies (Stripe, Sentry, email) are
        reported but their absence does not make the app not-ready.
        """
        checks: dict = {}
        overall_ok = True

        # --- Required: database ---
        db_check = {"name": "database", "required": True, "ok": False}
        try:
            from sqlalchemy import text as sa_text

            from app.db.session import engine
            t0 = time.monotonic()
            async with engine.connect() as conn:
                await conn.execute(sa_text("SELECT 1"))
            db_check["ok"] = True
            db_check["latency_ms"] = round((time.monotonic() - t0) * 1000, 1)
        except Exception as e:
            db_check["error"] = str(e)[:200]
            overall_ok = False
        checks["database"] = db_check

        # --- Optional: Redis (required iff configured) ---
        redis_required = bool(settings.redis_url)
        redis_check = {
            "name": "redis",
            "required": redis_required,
            "ok": not redis_required,  # if not configured, don't block
            "configured": redis_required,
        }
        if redis_required:
            try:
                import redis.asyncio as aioredis
                t0 = time.monotonic()
                r = aioredis.from_url(settings.redis_url, socket_timeout=2)
                await r.ping()
                await r.aclose()
                redis_check["ok"] = True
                redis_check["latency_ms"] = round((time.monotonic() - t0) * 1000, 1)
            except Exception as e:
                redis_check["error"] = str(e)[:200]
                overall_ok = False
        checks["redis"] = redis_check

        # --- Required: scheduler ---
        sched_check = {"name": "scheduler", "required": True, "ok": False}
        try:
            from app.scheduler import _scheduler
            if _scheduler and _scheduler.running:
                sched_check["ok"] = True
                sched_check["jobs"] = len(_scheduler.get_jobs())
            else:
                sched_check["error"] = "scheduler not running"
                overall_ok = False
        except Exception as e:
            sched_check["error"] = str(e)[:200]
            overall_ok = False
        checks["scheduler"] = sched_check

        # --- Required: startup state ---
        checks["startup"] = {
            "name": "startup",
            "required": True,
            "ok": startup_state.ready and startup_state.error is None,
            "error": startup_state.error,
        }
        if not checks["startup"]["ok"]:
            overall_ok = False

        # --- Optional: Stripe ---
        checks["stripe"] = {
            "name": "stripe",
            "required": False,
            "ok": bool(settings.stripe_secret_key),
            "configured": bool(settings.stripe_secret_key),
        }

        # --- Optional: Sentry ---
        checks["sentry"] = {
            "name": "sentry",
            "required": False,
            "ok": bool(settings.sentry_dsn),
            "configured": bool(settings.sentry_dsn),
        }

        # --- Optional: email ---
        checks["email"] = {
            "name": "email",
            "required": False,
            "ok": settings.email_enabled,
            "configured": settings.email_enabled,
        }

        body = {
            "status": "ready" if overall_ok else "not_ready",
            "checks": checks,
        }
        if not overall_ok:
            return JSONResponse(status_code=503, content=body)
        return body

    @app.get("/api/v1/system/features")
    async def system_features():
        """Public endpoint — returns booleans the frontend uses to decide
        whether to render feature-specific UI. Intentionally narrow: no
        error messages, no latency, no version info. Adding new flags
        here is fine; adding anything non-boolean is not.
        """
        return {
            "email_enabled": settings.email_enabled,
            "stripe_enabled": bool(settings.stripe_secret_key),
            "sentry_enabled": bool(settings.sentry_dsn),
        }

    return app


app = create_app()
