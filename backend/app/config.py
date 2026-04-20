"""Application settings."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_name: str = "Omni Copilot API"
    api_v1_prefix: str = "/api"
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "https://frontend-five-ebon-37.vercel.app",
            "https://frontend-5bc45j3w6-gagan0406s-projects.vercel.app",
        ]
    )

    database_url: str = "sqlite+aiosqlite:///./omni_copilot.db"
    openrouter_api_key: str | None = None
    llm_model: str = "openai/gpt-oss-20b:free"
    user_timezone: str = "Asia/Kolkata"
    composio_api_key: str | None = None
    workspace_root: Path = Field(default_factory=lambda: Path(__file__).resolve().parents[2])


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance."""

    return Settings()


settings = get_settings()
