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
        from app.services.vocabulary import ensure_vocabulary

        asr_provider = resolve_sync(db, Capability.asr)
        # 热词词表（设置页维护）同步到百炼；失败仅降级为不带热词
        vocabulary_id = (
            ensure_vocabulary(db, asr_provider) if asr_provider else None
        )
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(
                transcribe(recording.file_url, asr_provider, vocabulary_id)
            )
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

        # 5.5 播客来源转写完成后自动识别说话人姓名（shownotes 名单 + 自我介绍可推断真名）。
        #     本地上传不自动（多无 shownotes、识别率低），由用户在详情页手动触发。
        if recording.source == RecordingSource.podcast:
            try:
                from app.services.identify_speakers import identify_and_save

                out = identify_and_save(db, recording_id)
                if out.get("ok") and out.get("identified"):
                    logger.info(
                        "Recording %d auto-identified %d speaker name(s)",
                        recording_id,
                        out["identified"],
                    )
            except Exception as e:  # noqa: BLE001 - 识别失败不影响转写结果
                logger.warning(
                    "Auto speaker identify failed for %d: %s", recording_id, e
                )

        # 6. 持久化音频到 Supabase Storage，释放 Render 临时盘（仅本地上传文件）
        file_url = recording.file_url or ""
        if file_url and not file_url.startswith(("http://", "https://")):
            try:
                import os

                from app.services.storage import upload_to_supabase_sync

                public_url = upload_to_supabase_sync(file_url)
                if public_url:
                    recording.file_url = public_url
                    db.commit()
                    try:
                        os.remove(file_url)
                    except OSError:
                        pass
                    logger.info(
                        "Recording %d audio persisted to Supabase Storage",
                        recording_id,
                    )
            except Exception as e:  # noqa: BLE001 - 持久化失败不影响转写结果
                logger.warning("Audio persist failed for %d: %s", recording_id, e)

        # 7. piggyback：清理 30 天前的上传音频，释放 Supabase Storage 空间
        try:
            cleaned = cleanup_old_audio(db, days=30)
            if cleaned:
                logger.info(
                    "Cleaned %d old audio file(s) from Supabase Storage", cleaned
                )
        except Exception as e:  # noqa: BLE001 - 清理失败不影响转写
            logger.warning("Audio cleanup failed: %s", e)

    except Exception as e:
        logger.exception("Transcription failed for recording %d: %s", recording_id, e)
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if recording:
            recording.status = RecordingStatus.failed
            db.commit()
    finally:
        db.close()


def cleanup_old_audio(db, days: int = 30) -> int:
    """删除超过 days 天的上传音频文件（Supabase Storage），保留记录与转写稿。返回清理数。

    piggyback：每次转写完成后顺带调用（Render 免费实例无 cron）。只清上传来源、
    已持久化到 Supabase 的音频；播客外链与本地文件不动；file_url 置空，详情页降级为无回放。
    """
    from datetime import datetime, timedelta, timezone

    from app.services.storage import delete_from_supabase_sync

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    olds = (
        db.query(Recording)
        .filter(
            Recording.source == RecordingSource.upload,
            Recording.created_at < cutoff,
            Recording.file_url.like("%supabase.co%"),
        )
        .all()
    )
    cleaned = 0
    for r in olds:
        if delete_from_supabase_sync(r.file_url):
            r.file_url = ""
            cleaned += 1
    if cleaned:
        db.commit()
    return cleaned


@celery_app.task(bind=True)
def transcribe_recording(self, recording_id: int):
    """Celery 入口（保留备用；生产环境走 FastAPI BackgroundTasks）。"""
    run_transcription(recording_id)
