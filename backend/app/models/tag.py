from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin

recording_tags = Table(
    "recording_tags",
    Base.metadata,
    Column("recording_id", ForeignKey("recordings.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base, TimestampMixin):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))

    user: Mapped["User"] = relationship(back_populates="tags")
    recordings: Mapped[list["Recording"]] = relationship(
        secondary=recording_tags, back_populates="tags"
    )
