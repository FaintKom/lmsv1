from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(settings.get_database_url(), echo=settings.debug)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

replica_engine = None
if settings.replica_database_url:
    replica_engine = create_async_engine(settings.replica_database_url, echo=settings.debug)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_replica_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a read-only session against the replica, falling back to primary."""
    _engine = replica_engine or engine
    async with AsyncSession(_engine, expire_on_commit=False) as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
