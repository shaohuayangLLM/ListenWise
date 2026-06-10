"""add glossary table and transcript correction columns

Revision ID: a8c3e5f9d2b7
Revises: f7a9c2d4e6b1
Create Date: 2026-06-10 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = 'a8c3e5f9d2b7'
down_revision: Union[str, Sequence[str], None] = 'f7a9c2d4e6b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'glossary',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('terms', JSONB(), nullable=False, server_default='[]'),
        sa.Column('vocabulary_id', sa.String(length=100), nullable=True),
        sa.Column('target_model', sa.String(length=50), nullable=True),
        sa.Column('synced_hash', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.add_column('transcripts', sa.Column('original_segments', JSONB(), nullable=True))
    op.add_column('transcripts',
                  sa.Column('corrected_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('transcripts',
                  sa.Column('correction_model', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('transcripts', 'correction_model')
    op.drop_column('transcripts', 'corrected_at')
    op.drop_column('transcripts', 'original_segments')
    op.drop_table('glossary')
