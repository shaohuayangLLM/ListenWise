from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Transcript(Base, TimestampMixin):
    __tablename__ = "transcripts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    recording_id: Mapped[int] = mapped_column(
        ForeignKey("recordings.id", ondelete="CASCADE"), unique=True
    )
    segments: Mapped[dict] = mapped_column(JSONB, default=list)
    # segments format: [{"start": 0.0, "end": 5.2, "speaker": "A", "text": "..."}]
    full_text: Mapped[str] = mapped_column(Text, default="")
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    # speaker display-name overrides, e.g. {"A": "张三"}
    speaker_labels: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)  # tldr 纯文本
    outline: Mapped[list] = mapped_column(JSONB, default=list)        # [{title,start_sec,points}]
    highlights: Mapped[list] = mapped_column(JSONB, default=list)     # [{quote,start_sec,speaker}]
    keywords: Mapped[list] = mapped_column(JSONB, default=list)       # [{term,explanation}]
    summary_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    summary_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # LLM 术语订正：首次订正时备份原始 segments，支持一键还原
    original_segments: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    corrected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    correction_model: Mapped[str | None] = mapped_column(String(100), nullable=True)

    recording: Mapped["Recording"] = relationship(back_populates="transcript")
