import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create all tables on startup
    from app.db.base import Base
    from app.db.session import engine

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

    # Add new enum values to PostgreSQL (each ADD VALUE needs its own transaction)
    from sqlalchemy import text as sa_text

    for val in ("file_upload", "interactive"):
        try:
            async with engine.connect() as conn:
                await conn.execute(sa_text(
                    f"ALTER TYPE contenttype ADD VALUE IF NOT EXISTS '{val}'"
                ))
                await conn.commit()
        except Exception:
            pass

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")

    # Try Alembic migrations if available
    try:
        from alembic.config import Config
        from alembic import command

        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations applied successfully")
    except Exception as e:
        logger.debug(f"Alembic migrations skipped: {e}")

    logger.info("LearnHub Backend started")
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="LearnHub API",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Trust X-Forwarded-Proto from reverse proxy (Cloudflare/nginx)
    from starlette.middleware.trustedhost import TrustedHostMiddleware  # noqa

    @app.middleware("http")
    async def fix_redirect_scheme(request, call_next):
        response = await call_next(request)
        # Fix 307 redirects to use the original scheme (https) from proxy
        if response.status_code == 307 and "location" in response.headers:
            location = response.headers["location"]
            forwarded_proto = request.headers.get("x-forwarded-proto", "")
            if forwarded_proto == "https" and location.startswith("http://"):
                response.headers["location"] = location.replace("http://", "https://", 1)
        return response

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

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
