import sys
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings

# Enterprise connection pool parameters for handling concurrent traffic
engine = create_async_engine(
    settings.DATABASE_URI,
    echo=settings.DEBUG,
    pool_size=20,          # High-performance standard concurrent connections
    max_overflow=10,       # Allow burst spikes up to 30 connections
    pool_timeout=30,       # Fail gracefully if session is not free within 30s
    pool_recycle=1800,     # Recycle connection every 30 mins to avoid connection drift
    pool_pre_ping=True,    # Liveness check on connection before issuing query
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency injection provider for AsyncSession.
    Ensures rollback on exceptions and finalizes session cleanups cleanly.
    """
    session: AsyncSession = AsyncSessionLocal()
    try:
        yield session
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
