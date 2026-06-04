import asyncio
import logging

from app.celery_app import celery_app
from app.models.base import Capability, RecordingSource, RecordingStatus
from app.models.recording import Recording
from app.models.transcript import Transcript
from app.services.provider_config import resolve_sync
from app.sync_db import get_sync_db

logger = logging.getLogger(__name__)


def run_transcription(recording_id: int):
    """转写一条记录（同步执行，供 FastAPI BackgroundTasks 或 Celery 调用）。"""
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

        # 3. Resolve ASR provider config (DB first, .env fallback) and transcribe
        from app.services.asr import transcribe

        asr_provider = resolve_sync(db, Capability.asr)
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(transcribe(recording.file_url, asr_provider))
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
        recording.status = RecordingStatus.done
        recording.speaker_count = result.speaker_count
        recording.duration = int(result.segments[-1]["end"]) if result.segments else 0
        db.commit()
        logger.info("Recording %d status -> done", recording_id)

        # 6. 播客来源：转写完成自动生成 summary（D8：transcript+summary 自动）
        if recording.source == RecordingSource.podcast:
            try:
                from datetime import datetime, timezone

                from app.services.summarize import summarize

                llm = resolve_sync(db, Capability.llm)
                if llm and llm.api_key:
                    s = summarize(result.segments, llm)
                    transcript.summary = s.get("tldr", "")
                    transcript.outline = s.get("outline", [])
                    transcript.summary_model = llm.model
                    transcript.summary_at = datetime.now(timezone.utc)
                    db.commit()
                    logger.info("Recording %d podcast summary generated", recording_id)
            except Exception as e:  # noqa: BLE001 - 摘要失败不影响转写
                logger.error("Podcast summary failed for %d: %s", recording_id, e)

    except Exception as e:
        logger.exception("Transcription failed for recording %d: %s", recording_id, e)
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if recording:
            recording.status = RecordingStatus.failed
            db.commit()
    finally:
        db.close()


@celery_app.task(bind=True)
def transcribe_recording(self, recording_id: int):
    """Celery 入口（保留备用；生产环境走 FastAPI BackgroundTasks）。"""
    run_transcription(recording_id)
