"""add podcast show and episode catalog

Revision ID: f7a9c2d4e6b1
Revises: e6f2a4b9c1d8
Create Date: 2026-06-04 19:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f7a9c2d4e6b1"
down_revision: Union[str, Sequence[str], None] = "e6f2a4b9c1d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "podcast_shows",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("author", sa.String(length=300), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cover_url", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("feed_url", sa.Text(), nullable=True),
        sa.Column("external_id", sa.String(length=200), nullable=True),
        sa.Column("is_subscribed", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("source_limited", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_sync_message", sa.Text(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_url"),
    )
    op.create_table(
        "podcast_episodes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("show_id", sa.Integer(), nullable=True),
        sa.Column("recording_id", sa.Integer(), nullable=True),
        sa.Column("dedupe_key", sa.String(length=64), nullable=False),
        sa.Column("external_id", sa.String(length=500), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("shownotes_html", sa.Text(), nullable=True),
        sa.Column("shownotes_text", sa.Text(), nullable=True),
        sa.Column("episode_url", sa.Text(), nullable=True),
        sa.Column("audio_url", sa.Text(), nullable=True),
        sa.Column("cover_url", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("suggested_show_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["recording_id"], ["recordings.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["show_id"], ["podcast_shows.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dedupe_key"),
        sa.UniqueConstraint("recording_id"),
    )
    op.create_index("ix_podcast_episodes_show_id", "podcast_episodes", ["show_id"])
    op.create_index("ix_podcast_episodes_published_at", "podcast_episodes", ["published_at"])


def downgrade() -> None:
    op.drop_index("ix_podcast_episodes_published_at", table_name="podcast_episodes")
    op.drop_index("ix_podcast_episodes_show_id", table_name="podcast_episodes")
    op.drop_table("podcast_episodes")
    op.drop_table("podcast_shows")
