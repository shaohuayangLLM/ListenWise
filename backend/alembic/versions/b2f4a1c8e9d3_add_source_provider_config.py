"""add source, processing status, transcript ai fields, provider config

Revision ID: b2f4a1c8e9d3
Revises: bbe11390d184
Create Date: 2026-06-03 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2f4a1c8e9d3'
down_revision: Union[str, Sequence[str], None] = 'bbe11390d184'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False：type 仅由下方显式 .create(checkfirst=True) 建一次，
# 避免 add_column / create_table 的 ENUM 列自动重复 CREATE TYPE。
recordingsource = postgresql.ENUM('upload', 'podcast', 'realtime', name='recordingsource', create_type=False)
capability = postgresql.ENUM('asr', 'llm', 'translate', name='capability', create_type=False)


def upgrade() -> None:
    # 1. RecordingStatus 新增 processing 值（ADD VALUE 不能在事务内执行，用 autocommit_block）
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE recordingstatus ADD VALUE IF NOT EXISTS 'processing' BEFORE 'transcribing'"
        )

    # 2. recordings.source（现有行默认 upload）
    recordingsource.create(op.get_bind(), checkfirst=True)
    op.add_column(
        'recordings',
        sa.Column('source', recordingsource, nullable=False, server_default='upload'),
    )
    op.alter_column('recordings', 'source', server_default=None)

    # 3. transcripts AI / 编辑相关字段
    op.add_column(
        'transcripts',
        sa.Column('speaker_labels', postgresql.JSONB(astext_type=sa.Text()),
                  nullable=False, server_default='{}'),
    )
    op.add_column(
        'transcripts',
        sa.Column('is_edited', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column('transcripts', sa.Column('summary', sa.Text(), nullable=True))
    op.add_column('transcripts', sa.Column('summary_model', sa.String(length=100), nullable=True))
    op.add_column('transcripts', sa.Column('summary_at', sa.DateTime(timezone=True), nullable=True))
    op.alter_column('transcripts', 'speaker_labels', server_default=None)
    op.alter_column('transcripts', 'is_edited', server_default=None)

    # 4. model_provider_configs（按能力维度配置，capability 唯一）
    capability.create(op.get_bind(), checkfirst=True)
    op.create_table(
        'model_provider_configs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('capability', capability, nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('api_key_encrypted', sa.Text(), nullable=False, server_default=''),
        sa.Column('base_url', sa.String(length=300), nullable=True),
        sa.Column('model', sa.String(length=100), nullable=False, server_default=''),
        sa.Column('region', sa.String(length=50), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('capability'),
    )


def downgrade() -> None:
    op.drop_table('model_provider_configs')
    capability.drop(op.get_bind(), checkfirst=True)
    op.drop_column('transcripts', 'summary_at')
    op.drop_column('transcripts', 'summary_model')
    op.drop_column('transcripts', 'summary')
    op.drop_column('transcripts', 'is_edited')
    op.drop_column('transcripts', 'speaker_labels')
    op.drop_column('recordings', 'source')
    recordingsource.drop(op.get_bind(), checkfirst=True)
    # 注：PostgreSQL 不支持从 enum 删除值，processing 保留在 recordingstatus 中（无害）
