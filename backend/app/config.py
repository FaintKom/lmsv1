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

    # Where "new waitlist signup" notifications go. Empty disables them.
    waitlist_notify_email: str = ""

    # Sandbox
    sandbox_url: str = "http://localhost:8001"

    # Data retention (child-safety / GDPR storage limitation). Student accounts
    # dormant longer than this are purged by the scheduled retention job
    # (app/scheduler.py). 0 disables the purge. Default 24 months.
    data_retention_months: int = 24

    # Age gate / verifiable parental consent (GDPR Art. 8). A NEW student whose
    # self-reported date of birth puts them below this age cannot self-consent —
    # registration creates a consent-pending (inactive) account and emails a
    # verifiable-consent link to the parent/guardian. Germany's digital-consent
    # age is 16 (the GDPR default; member states may set it 13–16). Override per
    # deployment via env. Starting implementation, not legal advice.
    digital_consent_age: int = 16

    # Grace period (days) added beyond a ParentConsentToken's expiry before a
    # never-confirmed, consent-pending minor account is hard-deleted by the
    # scheduled purge job (app/scheduler.py). GDPR storage-limitation: don't
    # retain data for minors who were never onboarded. 0 purges as soon as the
    # token is expired. Default 7 days of slack beyond the 7-day token expiry.
    unconfirmed_consent_grace_days: int = 7

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # Lemon Squeezy — secondary payment provider (alongside Stripe).
    # Empty defaults disable LS endpoints (`is_enabled()` returns False).
    lemonsqueezy_api_key: str = ""
    lemonsqueezy_store_id: str = ""
    lemonsqueezy_webhook_secret: str = ""
    # Per-plan variant IDs (set in LS dashboard, paste here as strings).
    lemonsqueezy_starter_monthly_variant_id: str = ""
    lemonsqueezy_starter_yearly_variant_id: str = ""
    lemonsqueezy_professional_monthly_variant_id: str = ""
    lemonsqueezy_professional_yearly_variant_id: str = ""
    lemonsqueezy_enterprise_monthly_variant_id: str = ""
    lemonsqueezy_enterprise_yearly_variant_id: str = ""

    # Open Collective — donations module
    oc_api_token: str = ""
    oc_webhook_secret: str = ""
    oc_collective_slug: str = "grasslms"
    oc_graphql_url: str = "https://api.opencollective.com/graphql/v2"
    oc_success_url: str = ""  # e.g. https://grasslms.online/support/thanks

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
    email_from: str = "noreply@grasslms.online"
    email_from_name: str = "GrassLMS"
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

    # Read replica (optional). Falls back to primary when empty.
    replica_database_url: str = ""

    # Redis (optional). Rate limiter falls back to in-memory when empty.
    redis_url: str = ""

    # Per-endpoint rate limits (slowapi syntax: "N/unit"). Overrideable via
    # env so QA / load tests can raise the cap without changing the code.
    # Defaults match the historical hard-coded values.
    # Login/register are keyed per client IP. A whole school class often shares
    # ONE public IP (NAT), so 30+ students hit login from the same IP at lesson
    # start — limits must accommodate that. Bump these or override via env if a
    # class is bigger. (Proper per-account login throttling is a follow-up.)
    auth_login_rate_limit: str = "30/minute"
    auth_register_rate_limit: str = "20/hour"
    auth_password_reset_rate_limit: str = "3/hour"

    # Demo mode — exposes POST /auth/demo-login that returns a session
    # for a pre-configured demo account without any credentials. Off by
    # default. When on, also set the demo account emails below; the
    # endpoint will authenticate into whichever one the caller asks for.
    demo_mode_enabled: bool = False
    demo_student_email: str = "demo-student@grasslms.online"
    demo_teacher_email: str = "demo-teacher@grasslms.online"

    # File storage backend: "local" (default) or "s3" (S3-compatible).
    # When "s3", the S3_* settings below must be filled in. Switching
    # backends affects only NEW uploads — existing files stay where
    # they were written.
    storage_backend: str = "local"
    s3_bucket: str = ""
    s3_endpoint_url: str = ""  # R2: https://<account>.r2.cloudflarestorage.com
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_region: str = "auto"    # R2 expects "auto"; AWS expects e.g. "us-east-1"
    s3_public_url_base: str = ""  # optional CDN / custom domain in front of bucket

    # OAuth — Zoom
    zoom_client_id: str = ""
    zoom_client_secret: str = ""
    zoom_redirect_uri: str = ""

    # OAuth — Google (shared for Meet, Drive, Classroom)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""

    # OAuth — Microsoft (Teams)
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_redirect_uri: str = ""
    microsoft_tenant_id: str = ""

    # YouTube Data API
    youtube_api_key: str = ""

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
