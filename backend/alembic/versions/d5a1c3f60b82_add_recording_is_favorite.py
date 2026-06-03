"""add recording is_favorite

Revision ID: d5a1c3f60b82
Revises: c4e8b9a2d1f7
Create Date: 2026-06-03 21:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd5a1c3f60b82'
down_revision: Union[str, Sequence[str], None] = 'c4e8b9a2d1f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'recordings',
        sa.Column('is_favorite', sa.Boolean(), nullable=False,
                  server_default=sa.false()),
    )
    op.alter_column('recordings', 'is_favorite', server_default=None)


def downgrade() -> None:
    op.drop_column('recordings', 'is_favorite')
