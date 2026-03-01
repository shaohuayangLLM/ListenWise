from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import SceneType, TimestampMixin


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    recording_id: Mapped[int] = mapped_column(
        ForeignKey("recordings.id", ondelete="CASCADE"), unique=True
    )
    scene_type: Mapped[SceneType] = mapped_column()
    content: Mapped[dict] = mapped_column(JSONB, default=dict)
    # content format varies by scene_type, e.g.:
    # {"summary": "...", "key_decisions": [...], "action_items": [...]}
    format_version: Mapped[int] = mapped_column(Integer, default=1)

    recording: Mapped["Recording"] = relationship(back_populates="document")
