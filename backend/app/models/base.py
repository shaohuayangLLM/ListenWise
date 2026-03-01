import enum
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class RecordingStatus(str, enum.Enum):
    uploading = "uploading"
    transcribing = "transcribing"
    analyzing = "analyzing"
    done = "done"
    failed = "failed"


class SceneType(str, enum.Enum):
    requirement_review = "requirement_review"
    report_meeting = "report_meeting"
    leadership_conference = "leadership_conference"
    parent_meeting = "parent_meeting"
    phone_call = "phone_call"
    study_recording = "study_recording"
