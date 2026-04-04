"""Database engine and session helpers."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

engine: AsyncEngine = create_async_engine(settings.database_url, future=True, echo=False)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Yield an async database session."""

    async with SessionLocal() as session:
        yield session


async def create_tables() -> None:
    """Create all ORM tables if they don't exist yet.

    Called once on app startup. Safe to call repeatedly — uses CREATE IF NOT EXISTS.
    """
    from app.db.models import Base  # local import avoids circular deps at module level

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
