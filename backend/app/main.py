"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.connections import router as connections_router
from app.config import settings
from app.logging import configure_logging

configure_logging()
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Log startup and shutdown events."""

    logger.info("app_starting", app_name=settings.app_name, environment=settings.app_env)
    yield
    logger.info("app_stopping", app_name=settings.app_name, environment=settings.app_env)


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(chat_router, prefix=settings.api_v1_prefix)
app.include_router(connections_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    """Return service health metadata."""

    return {"status": "ok", "service": settings.app_name}
