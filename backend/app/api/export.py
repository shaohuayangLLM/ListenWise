from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.recording import Recording
from app.models.transcript import Transcript
from app.services.export import export_markdown, export_srt, export_text, export_vtt

router = APIRouter(tags=["export"])


class ExportFormat(str, Enum):
    md = "md"
    txt = "txt"
    srt = "srt"
    vtt = "vtt"


CONTENT_TYPES = {
    ExportFormat.md: "text/markdown; charset=utf-8",
    ExportFormat.txt: "text/plain; charset=utf-8",
    ExportFormat.srt: "application/x-subrip; charset=utf-8",
    ExportFormat.vtt: "text/vtt; charset=utf-8",
}

FILE_EXTENSIONS = {
    ExportFormat.md: ".md",
    ExportFormat.txt: ".txt",
    ExportFormat.srt: ".srt",
    ExportFormat.vtt: ".vtt",
}


@router.get("/api/recordings/{recording_id}/export")
async def export_recording(
    recording_id: int,
    format: ExportFormat = Query(ExportFormat.md),
    include_timestamps: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    # Load recording with related data
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Load transcript
    transcript_result = await db.execute(
        select(Transcript).where(Transcript.recording_id == recording_id)
    )
    transcript = transcript_result.scalar_one_or_none()

    # Prepare export data
    export_kwargs = dict(
        title=recording.title,
        duration=recording.duration,
        created_at=recording.created_at,
        transcript_segments=transcript.segments if transcript else None,
        transcript_full_text=transcript.full_text if transcript else None,
        include_timestamps=include_timestamps,
    )

    if format == ExportFormat.md:
        content = export_markdown(**export_kwargs)
    elif format == ExportFormat.txt:
        content = export_text(
            transcript.segments if transcript else None,
            transcript.full_text if transcript else None,
            include_timestamps=include_timestamps,
        )
    elif format == ExportFormat.srt:
        content = export_srt(transcript.segments if transcript else None)
    elif format == ExportFormat.vtt:
        content = export_vtt(transcript.segments if transcript else None)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

    filename = f"{recording.title}{FILE_EXTENSIONS[format]}"

    return Response(
        content=content,
        media_type=CONTENT_TYPES[format],
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
