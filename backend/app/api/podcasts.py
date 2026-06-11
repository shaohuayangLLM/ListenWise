"""播客节目订阅、单集目录与手动文字稿 API。"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.config import settings
from app.models import (
    PodcastEpisode,
    PodcastShow,
    Recording,
    RecordingSource,
    RecordingStatus,
    SceneType,
    Transcript,
)
from app.services.podcast_catalog import (
    Catalog,
    EpisodeMeta,
    fetch_catalog,
    import_episode,
    search_podcast_shows,
    search_youtube_videos,
)
from app.tasks.transcribe import run_transcription

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/podcasts", tags=["podcasts"])


class UrlBody(BaseModel):
    url: str
    title: str | None = None


class RefreshResult(BaseModel):
    show_id: int
    title: str
    added: int
    updated: int
    message: str | None = None
    error: str | None = None


class BatchTranscribeBody(BaseModel):
    episode_ids: list[int] = Field(min_length=1, max_length=10)


def _recording_status(recording: Recording | None) -> str:
    return recording.status.value if recording else "not_requested"


def _episode_response(episode: PodcastEpisode) -> dict:
    recording = episode.recording
    return {
        "id": episode.id,
        "show_id": episode.show_id,
        "show_title": episode.show.title if episode.show else None,
        "recording_id": episode.recording_id,
        "recording_status": _recording_status(recording),
        "title": episode.title,
        "description": episode.description,
        "shownotes_text": episode.shownotes_text,
        "episode_url": episode.episode_url,
        "audio_url_available": bool(episode.audio_url),
        "cover_url": episode.cover_url,
        "published_at": episode.published_at,
        "duration": episode.duration,
        "suggested_show_url": episode.suggested_show_url,
        "created_at": episode.created_at,
        "updated_at": episode.updated_at,
    }


def _preview_text(value: str | None, limit: int = 500) -> str | None:
    if not value:
        return value
    text = value.strip()
    return text if len(text) <= limit else f"{text[:limit]}..."


def _preview_episode_response(episode: EpisodeMeta) -> dict:
    return {
        "title": episode.title,
        "description": _preview_text(episode.description),
        "shownotes_text": _preview_text(episode.shownotes_text),
        "episode_url": episode.episode_url,
        "audio_url_available": bool(episode.audio_url),
        "cover_url": episode.cover_url,
        "published_at": episode.published_at,
        "duration": episode.duration,
    }


async def _show_response(show: PodcastShow, db: AsyncSession) -> dict:
    episode_count = await db.scalar(
        select(func.count()).select_from(PodcastEpisode).where(
            PodcastEpisode.show_id == show.id
        )
    )
    transcript_count = await db.scalar(
        select(func.count()).select_from(PodcastEpisode).where(
            PodcastEpisode.show_id == show.id,
            PodcastEpisode.recording_id.is_not(None),
        )
    )
    return {
        "id": show.id,
        "title": show.title,
        "author": show.author,
        "description": show.description,
        "cover_url": show.cover_url,
        "source_type": show.source_type,
        "source_url": show.source_url,
        "feed_url": show.feed_url,
        "is_subscribed": show.is_subscribed,
        "source_limited": show.source_limited,
        "last_sync_message": show.last_sync_message,
        "last_synced_at": show.last_synced_at,
        "episode_count": episode_count or 0,
        "transcript_count": transcript_count or 0,
        "created_at": show.created_at,
        "updated_at": show.updated_at,
    }


def _apply_episode(target: PodcastEpisode, meta: EpisodeMeta):
    target.external_id = meta.external_id
    target.title = meta.title[:500]
    target.description = meta.description
    target.shownotes_html = meta.shownotes_html
    target.shownotes_text = meta.shownotes_text
    target.episode_url = meta.episode_url
    target.audio_url = meta.audio_url
    target.cover_url = meta.cover_url
    target.published_at = meta.published_at
    target.duration = meta.duration
    target.suggested_show_url = meta.suggested_show_url


async def _prepare_transcription(
    db: AsyncSession, episode: PodcastEpisode
) -> tuple[Recording | None, bool]:
    if not episode.audio_url:
        return None, False

    recording = episode.recording
    if recording and recording.status in {
        RecordingStatus.uploading,
        RecordingStatus.transcribing,
        RecordingStatus.done,
    }:
        return recording, False
    if recording:
        recording.status = RecordingStatus.transcribing
        recording.file_url = episode.audio_url
        return recording, True

    recording = Recording(
        user_id=1,
        title=episode.title,
        scene_type=SceneType.study_recording,
        source=RecordingSource.podcast,
        source_url=episode.episode_url,
        status=RecordingStatus.transcribing,
        file_url=episode.audio_url,
        original_filename=(episode.audio_url.rsplit("/", 1)[-1] or "podcast")[:500],
        duration=episode.duration,
    )
    db.add(recording)
    await db.flush()
    episode.recording_id = recording.id
    return recording, True


async def _sync_catalog(
    db: AsyncSession, show: PodcastShow, catalog: Catalog
) -> tuple[int, int]:
    show.title = catalog.show.title[:500]
    show.author = catalog.show.author
    show.description = catalog.show.description
    show.cover_url = catalog.show.cover_url
    show.source_type = catalog.show.source_type
    show.feed_url = catalog.show.feed_url
    show.external_id = catalog.show.external_id
    show.source_limited = catalog.show.source_limited
    show.last_sync_message = catalog.show.sync_message
    show.last_synced_at = datetime.now(timezone.utc)

    keys = [episode.dedupe_key for episode in catalog.episodes]
    existing_result = await db.execute(
        select(PodcastEpisode).where(PodcastEpisode.dedupe_key.in_(keys))
    )
    existing = {episode.dedupe_key: episode for episode in existing_result.scalars()}
    added = 0
    updated = 0
    for meta in catalog.episodes:
        episode = existing.get(meta.dedupe_key)
        if episode:
            _apply_episode(episode, meta)
            if episode.show_id is None:
                episode.show_id = show.id
            updated += 1
            continue
        episode = PodcastEpisode(
            user_id=1,
            show_id=show.id,
            dedupe_key=meta.dedupe_key,
            title=meta.title[:500],
        )
        _apply_episode(episode, meta)
        db.add(episode)
        added += 1
    await db.commit()
    return added, updated


async def _refresh_show(
    db: AsyncSession, show: PodcastShow, *, offset: int = 0
) -> RefreshResult:
    try:
        catalog = await fetch_catalog(show.source_url, limit=50, offset=offset)
        added, updated = await _sync_catalog(db, show, catalog)
        return RefreshResult(
            show_id=show.id,
            title=show.title,
            added=added,
            updated=updated,
            message=show.last_sync_message,
        )
    except Exception as exc:  # noqa: BLE001 - 单节目失败不阻断全局刷新
        logger.exception("Podcast show %d refresh failed", show.id)
        show.last_sync_message = str(exc)
        show.last_synced_at = datetime.now(timezone.utc)
        await db.commit()
        return RefreshResult(
            show_id=show.id, title=show.title, added=0, updated=0, error=str(exc)
        )


@router.get("/shows")
async def list_shows(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PodcastShow).order_by(
            PodcastShow.is_subscribed.desc(), PodcastShow.updated_at.desc()
        )
    )
    return [await _show_response(show, db) for show in result.scalars()]


@router.get("/search")
async def search_shows(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(12, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    try:
        podcast_results = await search_podcast_shows(q, limit=limit)
        youtube_results = await search_youtube_videos(
            q,
            api_key=settings.youtube_api_key,
            limit=min(8, limit),
        )
        results = [*podcast_results, *youtube_results]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"节目搜索失败：{exc}") from exc

    feeds = [item.feed_url for item in results if item.feed_url]
    subscribed_by_feed: dict[str, int] = {}
    if feeds:
        existing = await db.execute(
            select(PodcastShow).where(PodcastShow.feed_url.in_(feeds))
        )
        subscribed_by_feed = {
            show.feed_url: show.id
            for show in existing.scalars()
            if show.feed_url and show.is_subscribed
        }

    return [
        {
            "source_type": item.source_type,
            "title": item.title,
            "author": item.author,
            "description": item.description,
            "cover_url": item.cover_url,
            "feed_url": item.feed_url,
            "source_url": item.source_url,
            "episode_count": item.episode_count,
            "source_label": item.source_label,
            "published_at": item.published_at,
            "subscribed_show_id": (
                subscribed_by_feed.get(item.feed_url) if item.feed_url else None
            ),
        }
        for item in results
    ]


@router.get("/preview")
async def preview_show(
    url: str = Query(..., min_length=1, max_length=1000),
    db: AsyncSession = Depends(get_db),
):
    target = url.strip()
    if not target.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="请输入有效的节目链接")
    try:
        catalog = await fetch_catalog(target, limit=20)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    subscribed_show_id = None
    result = await db.execute(select(PodcastShow).where(PodcastShow.source_url == target))
    show = result.scalar_one_or_none()
    if not show and catalog.show.feed_url:
        result = await db.execute(
            select(PodcastShow).where(PodcastShow.feed_url == catalog.show.feed_url)
        )
        show = result.scalar_one_or_none()
    if show and show.is_subscribed:
        subscribed_show_id = show.id

    return {
        "show": {
            "title": catalog.show.title,
            "author": catalog.show.author,
            "description": catalog.show.description,
            "cover_url": catalog.show.cover_url,
            "source_type": catalog.show.source_type,
            "source_url": target,
            "feed_url": catalog.show.feed_url,
            "source_limited": catalog.show.source_limited,
            "sync_message": catalog.show.sync_message,
            "total_available": catalog.total_available,
            "subscribed_show_id": subscribed_show_id,
        },
        "episodes": [_preview_episode_response(episode) for episode in catalog.episodes],
    }


@router.post("/shows")
async def subscribe_show(body: UrlBody, db: AsyncSession = Depends(get_db)):
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="请输入有效的 RSS 或小宇宙节目链接")
    try:
        catalog = await fetch_catalog(url, limit=50)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result = await db.execute(select(PodcastShow).where(PodcastShow.source_url == url))
    show = result.scalar_one_or_none()
    if not show and catalog.show.feed_url:
        result = await db.execute(
            select(PodcastShow).where(PodcastShow.feed_url == catalog.show.feed_url)
        )
        show = result.scalar_one_or_none()
    if not show:
        show = PodcastShow(
            user_id=1,
            title=catalog.show.title[:500],
            source_type=catalog.show.source_type,
            source_url=url,
            is_subscribed=True,
        )
        db.add(show)
        await db.flush()
    show.is_subscribed = True
    await _sync_catalog(db, show, catalog)
    await db.refresh(show)
    return await _show_response(show, db)


@router.post("/shows/refresh", response_model=list[RefreshResult])
async def refresh_all_shows(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PodcastShow).where(PodcastShow.is_subscribed.is_(True))
    )
    output = []
    for show in result.scalars():
        output.append(await _refresh_show(db, show))
    return output


@router.get("/shows/{show_id}")
async def get_show(show_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PodcastShow).where(PodcastShow.id == show_id))
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail="节目不存在")
    return await _show_response(show, db)


@router.post("/shows/{show_id}/refresh", response_model=RefreshResult)
async def refresh_show(show_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PodcastShow).where(PodcastShow.id == show_id))
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail="节目不存在")
    return await _refresh_show(db, show)


@router.post("/shows/{show_id}/load-more", response_model=RefreshResult)
async def load_more_episodes(show_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PodcastShow).where(PodcastShow.id == show_id))
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail="节目不存在")
    if show.source_limited and not show.feed_url:
        raise HTTPException(status_code=400, detail="该节目未匹配到 RSS，暂时无法加载更多")
    offset = await db.scalar(
        select(func.count()).select_from(PodcastEpisode).where(
            PodcastEpisode.show_id == show.id
        )
    )
    return await _refresh_show(db, show, offset=offset or 0)


@router.post("/shows/{show_id}/unsubscribe")
async def unsubscribe_show(show_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PodcastShow).where(PodcastShow.id == show_id))
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail="节目不存在")
    show.is_subscribed = False
    await db.commit()
    return {"ok": True}


@router.delete("/shows/{show_id}", status_code=204)
async def delete_show(show_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PodcastShow).where(PodcastShow.id == show_id))
    show = result.scalar_one_or_none()
    if not show:
        raise HTTPException(status_code=404, detail="节目不存在")
    await db.delete(show)
    await db.commit()


@router.get("/episodes")
async def list_episodes(
    show_id: int | None = Query(None),
    limit: int = Query(500, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(PodcastEpisode)
        .options(
            selectinload(PodcastEpisode.show), selectinload(PodcastEpisode.recording)
        )
        .order_by(
            PodcastEpisode.published_at.desc().nullslast(),
            PodcastEpisode.created_at.desc(),
        )
        .limit(limit)
    )
    if show_id is not None:
        query = query.where(PodcastEpisode.show_id == show_id)
    result = await db.execute(query)
    return [_episode_response(episode) for episode in result.scalars()]


@router.post("/episodes")
async def create_episode(body: UrlBody, db: AsyncSession = Depends(get_db)):
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="请输入有效的单集链接")
    try:
        meta = await import_episode(url, body.title)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result = await db.execute(
        select(PodcastEpisode)
        .options(selectinload(PodcastEpisode.show), selectinload(PodcastEpisode.recording))
        .where(PodcastEpisode.dedupe_key == meta.dedupe_key)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        episode = PodcastEpisode(
            user_id=1, dedupe_key=meta.dedupe_key, title=meta.title
        )
        _apply_episode(episode, meta)
        db.add(episode)
        await db.commit()
        result = await db.execute(
            select(PodcastEpisode)
            .options(
                selectinload(PodcastEpisode.show),
                selectinload(PodcastEpisode.recording),
            )
            .where(PodcastEpisode.id == episode.id)
        )
        episode = result.scalar_one()
    return _episode_response(episode)


@router.post("/episodes/batch-transcribe")
async def batch_transcribe_episodes(
    body: BatchTranscribeBody,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PodcastEpisode)
        .options(selectinload(PodcastEpisode.recording))
        .where(PodcastEpisode.id.in_(body.episode_ids))
    )
    episodes = {episode.id: episode for episode in result.scalars()}
    started: list[int] = []
    skipped: list[dict] = []

    for episode_id in dict.fromkeys(body.episode_ids):
        episode = episodes.get(episode_id)
        if not episode:
            skipped.append({"episode_id": episode_id, "reason": "单集不存在"})
            continue
        recording, should_start = await _prepare_transcription(db, episode)
        if not recording:
            skipped.append({"episode_id": episode_id, "reason": "没有公开音频地址"})
        elif not should_start:
            skipped.append(
                {"episode_id": episode_id, "reason": _recording_status(recording)}
            )
        else:
            started.append(recording.id)

    await db.commit()
    for recording_id in started:
        background_tasks.add_task(run_transcription, recording_id)
    return {"started": len(started), "recording_ids": started, "skipped": skipped}


@router.get("/episodes/{episode_id}")
async def get_episode(episode_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PodcastEpisode)
        .options(selectinload(PodcastEpisode.show), selectinload(PodcastEpisode.recording))
        .where(PodcastEpisode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="单集不存在")
    response = _episode_response(episode)
    transcript = None
    if episode.recording_id:
        transcript_result = await db.execute(
            select(Transcript).where(Transcript.recording_id == episode.recording_id)
        )
        row = transcript_result.scalar_one_or_none()
        if row:
            transcript = {
                "id": row.id,
                "recording_id": row.recording_id,
                "segments": row.segments,
                "full_text": row.full_text,
                "word_count": row.word_count,
                "speaker_labels": row.speaker_labels,
                "summary": row.summary,
                "outline": row.outline,
                "highlights": row.highlights,
                "keywords": row.keywords,
                "summary_model": row.summary_model,
                "summary_at": row.summary_at,
                "corrected_at": row.corrected_at,
                "correction_model": row.correction_model,
                "can_revert_correction": bool(row.original_segments),
            }
    response["transcript"] = transcript
    return response


@router.post("/episodes/{episode_id}/transcribe")
async def transcribe_episode(
    episode_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PodcastEpisode)
        .options(selectinload(PodcastEpisode.recording))
        .where(PodcastEpisode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="单集不存在")
    if not episode.audio_url:
        raise HTTPException(status_code=400, detail="该单集没有公开音频地址，无法获取文字稿")

    recording, should_start = await _prepare_transcription(db, episode)
    if not recording:
        raise HTTPException(status_code=400, detail="该单集没有公开音频地址，无法获取文字稿")
    if not should_start:
        return {"recording_id": recording.id, "status": recording.status.value}
    await db.commit()
    background_tasks.add_task(run_transcription, recording.id)
    return {"recording_id": recording.id, "status": recording.status.value}
