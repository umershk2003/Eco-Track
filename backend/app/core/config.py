import os
from typing import List, Literal
from pydantic import AnyHttpUrl, EmailStr, Field, PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # Core Application Configuration
    PROJECT_NAME: str = "EcoTrack"
    ENV: Literal["development", "production", "testing"] = "development"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # Security & Authentication
    JWT_SECRET_KEY: str = Field(default="super-secret-dev-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS Configurations
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://ecotrack.ai.studio",
        "https://ais-dev-o4zdonrfc7spscd6qxjpsz-278214394985.asia-southeast1.run.app",
        "https://ais-pre-o4zdonrfc7spscd6qxjpsz-278214394985.asia-southeast1.run.app",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v  # type: ignore
        raise ValueError(v)

    # Database Configuration (PostgreSQL Async)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "ecotrack"
    DATABASE_URI: str | None = None

    @field_validator("DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None, info) -> str:
        if isinstance(v, str) and v:
            return v
        data = info.data
        return f"postgresql+asyncpg://{data.get('POSTGRES_USER')}:{data.get('POSTGRES_PASSWORD')}@{data.get('POSTGRES_SERVER')}:{data.get('POSTGRES_PORT')}/{data.get('POSTGRES_DB')}"

    # Cache Configuration (Redis)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str | None = None
    REDIS_URI: str | None = None

    @field_validator("REDIS_URI", mode="before")
    @classmethod
    def assemble_redis_connection(cls, v: str | None, info) -> str:
        if isinstance(v, str) and v:
            return v
        data = info.data
        password_str = f":{data.get('REDIS_PASSWORD')}@" if data.get("REDIS_PASSWORD") else ""
        return f"redis://{password_str}{data.get('REDIS_HOST')}:{data.get('REDIS_PORT')}/0"

    # AI Service Provider Settings
    AI_PROVIDER: Literal["gemini", "openai", "claude", "local"] = "gemini"
    GEMINI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    CLAUDE_API_KEY: str | None = None

    # Object Storage Provider Settings
    STORAGE_PROVIDER: Literal["local", "gcs", "s3", "r2"] = "local"
    LOCAL_STORAGE_PATH: str = "./uploads"
    GCS_BUCKET_NAME: str | None = None
    S3_BUCKET_NAME: str | None = None

    # Observability (Prometheus, Sentry)
    SENTRY_DSN: str | None = None
    METRICS_PORT: int = 8000


settings = Settings()
