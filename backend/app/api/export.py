from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.document import Document
from app.models.recording import Recording
from app.models.transcript import Transcript
from app.services.export import export_docx, export_markdown, export_pdf

router = APIRouter(tags=["export"])


class ExportFormat(str, Enum):
    md = "md"
    docx = "docx"
    pdf = "pdf"


CONTENT_TYPES = {
    ExportFormat.md: "text/markdown; charset=utf-8",
    ExportFormat.docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ExportFormat.pdf: "application/pdf",
}

FILE_EXTENSIONS = {
    ExportFormat.md: ".md",
    ExportFormat.docx: ".docx",
    ExportFormat.pdf: ".pdf",
}


@router.get("/api/recordings/{recording_id}/export")
async def export_recording(
    recording_id: int,
    format: ExportFormat = Query(ExportFormat.md),
    include_transcript: bool = Query(True),
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

    # Load document
    doc_result = await db.execute(
        select(Document).where(Document.recording_id == recording_id)
    )
    document = doc_result.scalar_one_or_none()

    # Prepare export data
    export_kwargs = dict(
        title=recording.title,
        scene_type=recording.scene_type,
        duration=recording.duration,
        created_at=recording.created_at,
        document_content=document.content if document else None,
        transcript_segments=transcript.segments if transcript else None,
        transcript_full_text=transcript.full_text if transcript else None,
        include_transcript=include_transcript,
        include_timestamps=include_timestamps,
    )

    if format == ExportFormat.md:
        content = export_markdown(**export_kwargs)
    elif format == ExportFormat.docx:
        content = export_docx(**export_kwargs)
    elif format == ExportFormat.pdf:
        content = export_pdf(**export_kwargs)
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
