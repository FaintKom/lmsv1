from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://lms:lms_dev_password@localhost:5432/lms"
    async_database_url: str = ""

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

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


settings = Settings()
