from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class PodcastShow(Base, TimestampMixin):
    __tablename__ = "podcast_shows"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(500))
    author: Mapped[str | None] = mapped_column(String(300), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_type: Mapped[str] = mapped_column(String(30))
    source_url: Mapped[str] = mapped_column(Text, unique=True)
    feed_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_subscribed: Mapped[bool] = mapped_column(Boolean, default=True)
    source_limited: Mapped[bool] = mapped_column(Boolean, default=False)
    last_sync_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    episodes: Mapped[list["PodcastEpisode"]] = relationship(
        back_populates="show", cascade="all, delete-orphan"
    )


class PodcastEpisode(Base, TimestampMixin):
    __tablename__ = "podcast_episodes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    show_id: Mapped[int | None] = mapped_column(
        ForeignKey("podcast_shows.id", ondelete="CASCADE"), nullable=True
    )
    recording_id: Mapped[int | None] = mapped_column(
        ForeignKey("recordings.id", ondelete="SET NULL"), unique=True, nullable=True
    )
    dedupe_key: Mapped[str] = mapped_column(String(64), unique=True)
    external_id: Mapped[str | None] = mapped_column(String(500), nullable=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    shownotes_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    shownotes_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    episode_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration: Mapped[int] = mapped_column(Integer, default=0)
    suggested_show_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    show: Mapped["PodcastShow | None"] = relationship(back_populates="episodes")
    recording: Mapped["Recording | None"] = relationship()
