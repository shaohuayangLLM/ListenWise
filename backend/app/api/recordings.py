from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.base import RecordingStatus, SceneType
from app.models.document import Document
from app.models.recording import Recording
from app.models.transcript import Transcript
from app.schemas.recording import (
    ProcessingItem,
    ProcessingListResponse,
    RecordingListResponse,
    RecordingResponse,
    RecordingUploadResponse,
    STATUS_PROGRESS,
    StatsResponse,
    recording_to_response,
)
from app.services.storage import get_file_url, save_file

router = APIRouter(prefix="/api/recordings", tags=["recordings"])


@router.post("/upload", response_model=RecordingUploadResponse)
async def upload_recording(
    file: UploadFile,
    title: str = Form(...),
    scene_type: SceneType = Form(...),
    note: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    # Validate file extension
    if file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in settings.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: .{ext}. Allowed: {settings.allowed_extensions}",
            )

    # Validate file size (read content length from headers if available)
    if file.size and file.size > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB",
        )

    # Create recording record first to get the ID
    recording = Recording(
        user_id=1,  # MVP: hardcoded user
        title=title,
        scene_type=scene_type,
        status=RecordingStatus.uploading,
        file_url="",
        original_filename=file.filename or "unknown",
        file_size=file.size or 0,
        note=note,
    )
    db.add(recording)
    await db.flush()

    # Save file to local storage
    file_path = await save_file(file, recording.id)
    recording.file_url = file_path
    recording.status = RecordingStatus.transcribing

    # Update file_size if not available from headers
    if not recording.file_size:
        import os
        recording.file_size = os.path.getsize(file_path)

    await db.commit()
    await db.refresh(recording)

    # Trigger Celery transcription task
    from app.tasks.transcribe import transcribe_recording
    transcribe_recording.delay(recording.id)

    return RecordingUploadResponse(
        id=recording.id,
        status=recording.status,
        message="File uploaded successfully. Transcription will start shortly.",
    )


@router.get("/processing", response_model=ProcessingListResponse)
async def list_processing_recordings(
    db: AsyncSession = Depends(get_db),
):
    """Get all recordings currently being processed (for polling)."""
    result = await db.execute(
        select(Recording)
        .where(
            Recording.status.in_([
                RecordingStatus.uploading,
                RecordingStatus.transcribing,
                RecordingStatus.analyzing,
            ])
        )
        .order_by(Recording.created_at.desc())
    )
    recordings = result.scalars().all()

    items = [
        ProcessingItem(
            id=r.id,
            title=r.title,
            scene_type=r.scene_type,
            status=r.status,
            progress=STATUS_PROGRESS.get(r.status, 0),
            created_at=r.created_at,
        )
        for r in recordings
    ]
    return ProcessingListResponse(items=items, count=len(items))


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    recording_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    return recording_to_response(recording)


@router.get("", response_model=RecordingListResponse)
async def list_recordings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    scene_type: SceneType | None = Query(None),
    status: RecordingStatus | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Recording).order_by(Recording.created_at.desc())

    if scene_type:
        query = query.where(Recording.scene_type == scene_type)
    if status:
        query = query.where(Recording.status == status)

    # Count total
    count_query = select(func.count()).select_from(Recording)
    if scene_type:
        count_query = count_query.where(Recording.scene_type == scene_type)
    if status:
        count_query = count_query.where(Recording.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    recordings = result.scalars().all()

    return RecordingListResponse(
        items=[recording_to_response(r) for r in recordings],
        total=total,
        page=page,
        page_size=page_size,
    )


stats_router = APIRouter(tags=["stats"])


@stats_router.get("/api/stats", response_model=StatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Total count
    total_result = await db.execute(select(func.count()).select_from(Recording))
    total_count = total_result.scalar() or 0

    # Total duration
    duration_result = await db.execute(
        select(func.coalesce(func.sum(Recording.duration), 0))
    )
    total_duration = duration_result.scalar() or 0

    # Pending count (uploading, transcribing, analyzing)
    pending_result = await db.execute(
        select(func.count()).select_from(Recording).where(
            Recording.status.in_([
                RecordingStatus.uploading,
                RecordingStatus.transcribing,
                RecordingStatus.analyzing,
            ])
        )
    )
    pending_count = pending_result.scalar() or 0

    # This week count
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_result = await db.execute(
        select(func.count()).select_from(Recording).where(
            Recording.created_at >= week_start
        )
    )
    week_count = week_result.scalar() or 0

    return StatsResponse(
        total_count=total_count,
        total_duration=total_duration,
        pending_count=pending_count,
        week_count=week_count,
    )


@router.get("/{recording_id}/transcript")
async def get_transcript(
    recording_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get the transcript for a recording."""
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    result = await db.execute(
        select(Transcript).where(Transcript.recording_id == recording_id)
    )
    transcript = result.scalar_one_or_none()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not ready yet")

    return {
        "id": transcript.id,
        "recording_id": transcript.recording_id,
        "segments": transcript.segments,
        "full_text": transcript.full_text,
        "word_count": transcript.word_count,
        "created_at": transcript.created_at,
    }


@router.get("/{recording_id}/document")
async def get_document(
    recording_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get the generated document for a recording."""
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    result = await db.execute(
        select(Document).where(Document.recording_id == recording_id)
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not ready yet")

    return {
        "id": document.id,
        "recording_id": document.recording_id,
        "scene_type": document.scene_type,
        "content": document.content,
        "format_version": document.format_version,
        "created_at": document.created_at,
    }
