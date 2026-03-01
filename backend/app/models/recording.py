from sqlalchemy import BigInteger, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import RecordingStatus, SceneType, TimestampMixin
from app.models.tag import recording_tags


class Recording(Base, TimestampMixin):
    __tablename__ = "recordings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(500))
    file_url: Mapped[str] = mapped_column(Text)
    original_filename: Mapped[str] = mapped_column(String(500))
    scene_type: Mapped[SceneType] = mapped_column()
    folder_id: Mapped[int | None] = mapped_column(
        ForeignKey("folders.id", ondelete="SET NULL"), nullable=True
    )
    duration: Mapped[int] = mapped_column(default=0)  # seconds
    file_size: Mapped[int] = mapped_column(BigInteger, default=0)  # bytes
    status: Mapped[RecordingStatus] = mapped_column(default=RecordingStatus.uploading)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    speaker_count: Mapped[int] = mapped_column(default=0)

    user: Mapped["User"] = relationship(back_populates="recordings")
    folder: Mapped["Folder | None"] = relationship(back_populates="recordings")
    transcript: Mapped["Transcript | None"] = relationship(
        back_populates="recording", uselist=False
    )
    document: Mapped["Document | None"] = relationship(
        back_populates="recording", uselist=False
    )
    tags: Mapped[list["Tag"]] = relationship(
        secondary=recording_tags, back_populates="recordings"
    )
