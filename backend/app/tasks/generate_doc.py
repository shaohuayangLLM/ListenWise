import asyncio
import logging

from app.celery_app import celery_app
from app.models.base import RecordingStatus
from app.models.document import Document
from app.models.recording import Recording
from app.models.transcript import Transcript
from app.sync_db import get_sync_db

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def generate_document_task(self, recording_id: int):
    """Generate a structured document from transcript using LLM."""
    logger.info("Starting document generation for recording %d", recording_id)

    db = get_sync_db()
    try:
        # 1. Get Transcript
        transcript = (
            db.query(Transcript)
            .filter(Transcript.recording_id == recording_id)
            .first()
        )
        if not transcript:
            logger.error("Transcript not found for recording %d", recording_id)
            return

        # 2. Get Recording scene_type
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if not recording:
            logger.error("Recording %d not found", recording_id)
            return

        scene_type = recording.scene_type.value

        # 3. Call LLM service
        from app.services.llm import generate_document

        loop = asyncio.new_event_loop()
        try:
            content = loop.run_until_complete(
                generate_document(transcript.full_text, scene_type)
            )
        finally:
            loop.close()

        logger.info("Document generation complete for recording %d", recording_id)

        # 4. Create Document record
        document = Document(
            recording_id=recording_id,
            scene_type=recording.scene_type,
            content=content,
            format_version=1,
        )
        db.add(document)

        # 5. Update Recording status to done
        recording.status = RecordingStatus.done
        db.commit()
        logger.info("Recording %d status -> done", recording_id)

    except Exception as e:
        logger.exception(
            "Document generation failed for recording %d: %s", recording_id, e
        )
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if recording:
            recording.status = RecordingStatus.failed
            db.commit()
        raise
    finally:
        db.close()
