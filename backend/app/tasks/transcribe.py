import asyncio
import logging

from app.celery_app import celery_app
from app.models.base import RecordingStatus
from app.models.recording import Recording
from app.models.transcript import Transcript
from app.sync_db import get_sync_db

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def transcribe_recording(self, recording_id: int):
    """Transcribe a recording using ASR service."""
    logger.info("Starting transcription for recording %d", recording_id)

    db = get_sync_db()
    try:
        # 1. Get Recording
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if not recording:
            logger.error("Recording %d not found", recording_id)
            return

        # 2. Update status to transcribing
        recording.status = RecordingStatus.transcribing
        db.commit()
        logger.info("Recording %d status -> transcribing", recording_id)

        # 3. Call ASR service (run async function in sync context)
        from app.services.asr import transcribe

        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(transcribe(recording.file_url))
        finally:
            loop.close()

        logger.info(
            "Transcription complete: %d segments, %d words, %d speakers",
            len(result.segments),
            result.word_count,
            result.speaker_count,
        )

        # 4. Create Transcript record
        transcript = Transcript(
            recording_id=recording_id,
            segments=result.segments,
            full_text=result.full_text,
            word_count=result.word_count,
        )
        db.add(transcript)

        # 5. Update Recording status and speaker_count
        recording.status = RecordingStatus.analyzing
        recording.speaker_count = result.speaker_count
        recording.duration = int(result.segments[-1]["end"]) if result.segments else 0
        db.commit()
        logger.info("Recording %d status -> analyzing", recording_id)

        # 6. Trigger document generation
        from app.tasks.generate_doc import generate_document_task

        generate_document_task.delay(recording_id)
        logger.info("Triggered document generation for recording %d", recording_id)

    except Exception as e:
        logger.exception("Transcription failed for recording %d: %s", recording_id, e)
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if recording:
            recording.status = RecordingStatus.failed
            db.commit()
        raise
    finally:
        db.close()
