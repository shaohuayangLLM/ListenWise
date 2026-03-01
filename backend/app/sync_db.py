"""Synchronous database session for Celery tasks."""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

# Convert async URL to sync URL
sync_url = settings.database_url.replace("+asyncpg", "")

sync_engine = create_engine(sync_url)
SyncSession = sessionmaker(bind=sync_engine, class_=Session, expire_on_commit=False)


def get_sync_db() -> Session:
    """Get a synchronous database session."""
    return SyncSession()
