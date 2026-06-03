from datetime import datetime

from pydantic import BaseModel

from app.models.base import RecordingStatus


class RecordingCreate(BaseModel):
    title: str
    note: str | None = None


class RecordingResponse(BaseModel):
    id: int
    title: str
    status: RecordingStatus
    file_url: str
    original_filename: str
    duration: int
    file_size: int
    note: str | None
    speaker_count: int
    folder_id: int | None
    is_favorite: bool
    progress: int  # 0-100, computed from status
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecordingUpdate(BaseModel):
    title: str | None = None
    is_favorite: bool | None = None


# Progress percentages mapped from status
STATUS_PROGRESS = {
    RecordingStatus.uploading: 10,
    RecordingStatus.transcribing: 60,
    RecordingStatus.done: 100,
    RecordingStatus.failed: 0,
}


def recording_to_response(recording) -> "RecordingResponse":
    progress = STATUS_PROGRESS.get(recording.status, 0)
    return RecordingResponse(
        id=recording.id,
        title=recording.title,
        status=recording.status,
        file_url=recording.file_url,
        original_filename=recording.original_filename,
        duration=recording.duration,
        file_size=recording.file_size,
        note=recording.note,
        speaker_count=recording.speaker_count,
        folder_id=recording.folder_id,
        is_favorite=recording.is_favorite,
        progress=progress,
        created_at=recording.created_at,
        updated_at=recording.updated_at,
    )


class RecordingListResponse(BaseModel):
    items: list[RecordingResponse]
    total: int
    page: int
    page_size: int


class ProcessingItem(BaseModel):
    id: int
    title: str
    status: RecordingStatus
    progress: int
    created_at: datetime


class ProcessingListResponse(BaseModel):
    items: list[ProcessingItem]
    count: int


class RecordingUploadResponse(BaseModel):
    id: int
    status: RecordingStatus
    message: str


class StatsResponse(BaseModel):
    total_count: int
    total_duration: int
    pending_count: int
    week_count: int
