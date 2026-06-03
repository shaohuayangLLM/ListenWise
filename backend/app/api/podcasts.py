"""播客链接转写 API（P1）。

支持两类输入：
  ① 直接音频 URL（.mp3/.m4a 等）—— 直接转写
  ② 单集网页链接（如小宇宙）—— 抓页面 og:audio / enclosure 提取音频直链
本质 = 拿到音频 URL → 复用 P0 转写链路 + 自动 LLM summary（D8）。
"""

import logging
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Recording, RecordingSource, RecordingStatus, SceneType
from app.tasks.transcribe import transcribe_recording

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/podcasts", tags=["podcasts"])

_AUDIO_EXT = re.compile(r"\.(mp3|m4a|wav|aac|flac|ogg)(\?|$)", re.I)


class PodcastCreate(BaseModel):
    url: str
    title: str | None = None


class PodcastCreateResponse(BaseModel):
    id: int
    status: str
    message: str


async def _resolve_audio(url: str) -> tuple[str, str | None]:
    """返回 (音频直链, 页面标题)。直链直接返回；网页则抓 og:audio / enclosure。"""
    if _AUDIO_EXT.search(url):
        return url, None
    # 单集网页（小宇宙等）：抓静态 HTML 里的 og:audio / enclosure
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
    html = resp.text
    m = re.search(r'og:audio"\s+content="([^"]+)"', html) or re.search(
        r'"enclosure":\s*\{\s*"url":\s*"([^"]+)"', html
    )
    if not m:
        raise HTTPException(
            status_code=400, detail="无法从该页面解析出音频地址，请改用音频直链"
        )
    audio_url = m.group(1)
    tm = re.search(r'og:title"\s+content="([^"]+)"', html)
    return audio_url, (tm.group(1) if tm else None)


@router.post("", response_model=PodcastCreateResponse)
async def create_podcast(body: PodcastCreate, db: AsyncSession = Depends(get_db)):
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="请输入有效的链接（http/https）")

    audio_url, page_title = await _resolve_audio(url)

    recording = Recording(
        user_id=1,  # MVP: hardcoded user
        title=body.title or page_title or "播客转写",
        scene_type=SceneType.study_recording,  # legacy 列
        source=RecordingSource.podcast,
        source_url=url,
        status=RecordingStatus.transcribing,
        file_url=audio_url,  # 音频直链，asr 直传 Fun-ASR
        original_filename=(audio_url.rsplit("/", 1)[-1] or "podcast")[:200],
    )
    db.add(recording)
    await db.commit()
    await db.refresh(recording)

    transcribe_recording.delay(recording.id)
    logger.info("Podcast %d created (audio=%s)", recording.id, audio_url)
    return PodcastCreateResponse(
        id=recording.id,
        status=recording.status.value,
        message="已提交，转写完成后将自动生成摘要",
    )
