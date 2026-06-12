"""LLM 自动说话人命名：根据对话里的自我介绍/互相称呼 + 节目背景，
把 ASR 的 A/B/C 说话人标记映射成真实姓名（写入 speaker_labels）。

参考 PodNote：用 LLM 从「我是石磊」这类自我介绍 + shownotes 主播名单推断姓名。
宁缺勿错——识别不出的说话人不返回，保持原标记，用户仍可手动改。
"""

import json
import logging

import httpx

from app.services.provider_config import ResolvedProvider
from app.services.summarize import _extract_json

logger = logging.getLogger(__name__)

# 自我介绍多在开头，节选前若干字符即可覆盖；过长徒增成本
_LINES_LIMIT = 8000

_PROMPT = """你是播客/会议转写的说话人识别助手。下面的逐字稿用 A/B/C 等标记区分说话人。
请根据：① 对话中的自我介绍（如"我是石磊"）、互相称呼（如"敏姐你怎么看"）；② 下方节目/会议背景里的人物名单，推断每个说话人标记对应的真实姓名。

只输出严格 JSON：{{"A": "石磊", "B": "刘敏"}}——键是原说话人标记，值是推断的真实姓名。
- 有把握才填；识别不出的说话人**不要写进结果**（宁缺勿错，绝不编造姓名）。
- 姓名用对话/背景里出现的真实写法（含昵称对应的本名，如「敏姐」对应名单里的「刘敏」）。
- 不要任何额外文字或 markdown 代码块标记。

节目/会议背景：
{context}

逐字稿（节选）：
{lines}
"""


def _build_lines(segments: list[dict]) -> str:
    out: list[str] = []
    size = 0
    for s in segments:
        sp = s.get("speaker") or "?"
        text = s.get("text", "")
        line = f"{sp}: {text}"
        if size + len(line) > _LINES_LIMIT:
            break
        out.append(line)
        size += len(line)
    return "\n".join(out)


def identify_speakers(
    segments: list[dict],
    context: str,
    provider: ResolvedProvider,
) -> dict[str, str]:
    """返回 {说话人标记: 真实姓名}，识别不出的不含在内。"""
    speakers = {s.get("speaker") for s in segments if s.get("speaker")}
    if not speakers:
        return {}

    lines = _build_lines(segments)
    prompt = _PROMPT.format(context=context.strip() or "（无）", lines=lines)
    base = (
        provider.base_url or "https://dashscope.aliyuncs.com/compatible-mode/v1"
    ).rstrip("/")

    resp = httpx.post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {provider.api_key}"},
        json={
            "model": provider.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
        },
        timeout=120,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    try:
        data = _extract_json(content)
    except (json.JSONDecodeError, ValueError) as e:
        logger.error("说话人识别 JSON 解析失败: %s; raw=%s", e, content[:300])
        return {}

    # 只保留真实存在的说话人标记 + 非空姓名
    result: dict[str, str] = {}
    for k, v in data.items():
        if k in speakers and isinstance(v, str) and v.strip():
            result[k] = v.strip()
    return result


def identify_and_save(db, recording_id: int) -> dict:
    """识别说话人姓名并写入 transcript.speaker_labels（不覆盖用户手动命名）。

    供 API endpoint（手动触发）与转写任务（播客自动触发）复用。db 由调用方管理。
    返回 {"ok": False, "error": str} 或 {"ok": True, "speaker_labels": {...}, "identified": int}。
    """
    from app.models.base import Capability
    from app.models.podcast import PodcastEpisode
    from app.models.recording import Recording
    from app.models.transcript import Transcript
    from app.services.provider_config import resolve_sync

    transcript = (
        db.query(Transcript).filter(Transcript.recording_id == recording_id).first()
    )
    if not transcript or not transcript.segments:
        return {"ok": False, "error": "转写尚未完成，无法识别说话人"}

    llm = resolve_sync(db, Capability.llm)
    if not (llm and llm.api_key):
        return {"ok": False, "error": "未配置大模型，请先在设置中配置"}

    # 上下文：播客 shownotes（含主播名单）+ 上传备注，辅助 LLM 推断姓名
    context_parts: list[str] = []
    episode = (
        db.query(PodcastEpisode)
        .filter(PodcastEpisode.recording_id == recording_id)
        .first()
    )
    if episode and episode.shownotes_text:
        context_parts.append(episode.shownotes_text[:2000])
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if recording and recording.note:
        context_parts.append(recording.note[:1000])

    labels = identify_speakers(transcript.segments, "\n".join(context_parts), llm)

    # AI 识别的填入，但不覆盖用户已手动命名的（用户优先）
    merged = dict(transcript.speaker_labels or {})
    added = 0
    for k, v in labels.items():
        if k not in merged:
            merged[k] = v
            added += 1
    if added:
        transcript.speaker_labels = merged
        transcript.is_edited = True
        db.commit()
    return {"ok": True, "speaker_labels": merged, "identified": added}
