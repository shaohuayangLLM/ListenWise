"""add podcast source_url and structured AI summary fields

Revision ID: c4e8b9a2d1f7
Revises: b2f4a1c8e9d3
Create Date: 2026-06-03 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c4e8b9a2d1f7'
down_revision: Union[str, Sequence[str], None] = 'b2f4a1c8e9d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('recordings', sa.Column('source_url', sa.Text(), nullable=True))
    for col in ('outline', 'highlights', 'keywords'):
        op.add_column(
            'transcripts',
            sa.Column(col, postgresql.JSONB(astext_type=sa.Text()),
                      nullable=False, server_default='[]'),
        )
        op.alter_column('transcripts', col, server_default=None)


def downgrade() -> None:
    op.drop_column('transcripts', 'keywords')
    op.drop_column('transcripts', 'highlights')
    op.drop_column('transcripts', 'outline')
    op.drop_column('recordings', 'source_url')
