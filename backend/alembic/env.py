import os
from logging.config import fileConfig

from sqlalchemy import create_engine, engine_from_config, pool

from alembic import context

from app.database import Base
from app.models import *  # noqa: F401, F403 - import all models for autogenerate

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# DATABASE_URL 环境变量覆盖 alembic.ini，并转成 sync 驱动（psycopg2）。
# 直接存为模块变量、绕过 config.set_main_option —— 否则 configparser 会把
# 密码里的 % 当成插值语法报错（例如密码含特殊字符编码后的 %23）。
_db_url = os.environ.get("DATABASE_URL")
SYNC_URL = (
    _db_url.replace("postgresql+asyncpg://", "postgresql://") if _db_url else None
)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = SYNC_URL or config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    if SYNC_URL:
        connectable = create_engine(SYNC_URL, poolclass=pool.NullPool)
    else:
        connectable = engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
