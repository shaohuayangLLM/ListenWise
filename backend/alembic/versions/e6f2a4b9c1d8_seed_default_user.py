"""seed default user (id=1) for single-user MVP

Recordings 硬编码 user_id=1，全新数据库需保证该用户存在，否则插入记录违反外键。
幂等：已存在则跳过。

Revision ID: e6f2a4b9c1d8
Revises: d5a1c3f60b82
Create Date: 2026-06-04 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'e6f2a4b9c1d8'
down_revision: Union[str, Sequence[str], None] = 'd5a1c3f60b82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO users (id, name, email, hashed_password, created_at, updated_at)
        VALUES (1, 'Demo User', 'demo@listenwise.local', '', now(), now())
        ON CONFLICT (id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM users WHERE id = 1")
