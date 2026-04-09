from pydantic_settings import BaseSettings

# Sentinel value used to detect an unset JWT secret. Must not appear in production.
JWT_SECRET_DEFAULT = "change-me-in-production"


class Settings(BaseSettings):
    # Environment
    environment: str = "development"  # development | staging | production

    # Database
    database_url: str = "postgresql+asyncpg://lms:lms_dev_password@localhost:5432/lms"
    async_database_url: str = ""

    # JWT
    jwt_secret: str = JWT_SECRET_DEFAULT
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # Super admin bootstrap (optional; super admin is only created if both are set)
    super_admin_email: str = ""
    super_admin_password: str = ""

    # Sandbox
    sandbox_url: str = "http://localhost:8001"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Uploads
    upload_dir: str = "/data/uploads"
    max_upload_mb: int = 50

    # Email
    email_enabled: bool = False
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "noreply@learnhub.io"
    email_from_name: str = "LearnHub"
    app_url: str = "http://localhost:3000"

    # Email verification enforcement. Off by default — only enable once SMTP
    # is configured and tested, otherwise unverified users cannot log in.
    require_email_verification: bool = False

    # Sentry error tracking. Empty DSN disables Sentry entirely.
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.1  # 10% — tune for free tier quota

    # Logging
    log_level: str = "INFO"  # DEBUG / INFO / WARNING / ERROR
    log_json: bool = True    # structured JSON in production, pretty console in dev

    # App
    app_name: str = "LMS"
    debug: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}

    def get_cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def get_database_url(self) -> str:
        """Return asyncpg-compatible database URL."""
        url = self.async_database_url or self.database_url
        # Render provides postgresql:// but we need postgresql+asyncpg://
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    def validate_production(self) -> list[str]:
        """Return a list of configuration errors that must be fixed in production.

        Called on startup. In production, any non-empty return value means the
        app refuses to start. In development, errors are logged as warnings.
        """
        errors: list[str] = []
        if self.jwt_secret == JWT_SECRET_DEFAULT:
            errors.append(
                "JWT_SECRET is set to the default value. Generate a new 64+ char secret."
            )
        if len(self.jwt_secret) < 32:
            errors.append(
                f"JWT_SECRET is too short ({len(self.jwt_secret)} chars). Use at least 32."
            )
        if self.debug:
            errors.append("DEBUG must be false in production.")
        return errors


settings = Settings()
