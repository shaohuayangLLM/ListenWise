import re
from pathlib import Path

from app.config import settings
from app.models.podcast import PodcastEpisode
from app.models.recording import Recording
from app.models.transcript import Transcript
from app.services.export import _format_timestamp

_FILENAME_UNSAFE = re.compile(r'[\\/:*?"<>|\n\r\t]+')


def _safe_filename(value: str) -> str:
    name = _FILENAME_UNSAFE.sub(" ", value).strip()
    name = re.sub(r"\s+", " ", name)
    return (name[:120] or "未命名转写").rstrip(".")


def _yaml_value(value) -> str:
    if value is None or value == "":
        return '""'
    if isinstance(value, (int, float)):
        return str(value)
    return '"' + str(value).replace("\\", "\\\\").replace('"', '\\"') + '"'


def _format_duration_minutes(seconds: int) -> int:
    return max(1, round((seconds or 0) / 60))


def _published_date(recording: Recording, episode: PodcastEpisode | None) -> str:
    value = episode.published_at if episode and episode.published_at else recording.created_at
    return value.strftime("%Y-%m-%d")


def _ts_hms(ts) -> str:
    """Obsidian 文字稿时间戳：始终 HH:MM:SS（贴齐参考格式）。"""
    h, rem = divmod(int(ts or 0), 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def _segment_lines(segments: list | dict | None, full_text: str | None) -> list[str]:
    if isinstance(segments, dict):
        segments = segments.get("segments", [])
    if isinstance(segments, list) and segments:
        lines = []
        for segment in segments:
            if not isinstance(segment, dict):
                continue
            timestamp = _ts_hms(segment.get("start", 0))
            speaker = segment.get("speaker")
            text = segment.get("text", "")
            prefix = f"**[{timestamp}]**"
            if speaker:
                prefix += f" **{speaker}**"
            lines.append(f"{prefix} {text}")
            lines.append("")
        return lines
    return [full_text or "暂无转写文本", ""]


def _frontmatter(
    recording: Recording, transcript: Transcript, episode: PodcastEpisode | None
) -> str:
    show = episode.show if episode else None
    source_url = (
        episode.episode_url
        if episode and episode.episode_url
        else recording.source_url
    )
    lines = ["---", f"title: {_yaml_value(recording.title)}"]
    if show:
        lines.append(f"podcast: {_yaml_value(show.title)}")
        if show.author:
            lines.append(f"hosts: [{_yaml_value(show.author)}]")
    lines.append(f"date: {_yaml_value(_published_date(recording, episode))}")
    lines.append(f"duration: {_format_duration_minutes(recording.duration)}")
    if source_url:
        lines.append(f"source_url: {_yaml_value(source_url)}")
    lines.append(f"status: {_yaml_value('已转录')}")
    lines.append("tags:")
    if show:
        lines.append(f"  - {_yaml_value(f'播客/{show.title}')}")
    else:
        lines.append(f"  - {_yaml_value('ListenWise')}")
    lines.append("cards: []")
    lines.extend(["---", ""])
    return "\n".join(lines)


def _info_section(recording: Recording, episode: PodcastEpisode | None) -> list[str]:
    show = episode.show if episode else None
    source_url = (
        episode.episode_url
        if episode and episode.episode_url
        else recording.source_url
    )
    lines = ["## 节目信息", ""]
    if show:
        lines.append(f"- 节目：{show.title}")
    if show and show.author:
        lines.append(f"- 作者：{show.author}")
    lines.append(f"- 日期：{_published_date(recording, episode)}")
    lines.append(f"- 时长：{_format_duration_minutes(recording.duration)} 分钟")
    if source_url:
        lines.append(f"- 原始链接：[链接]({source_url})")
    if show and show.feed_url:
        lines.append(f"- RSS：[链接]({show.feed_url})")
    lines.append("")
    return lines


def _ai_section(transcript: Transcript) -> list[str]:
    has_summary = bool(transcript.summary)
    has_outline = bool(transcript.outline)
    has_highlights = bool(transcript.highlights)
    has_keywords = bool(transcript.keywords)
    if not any([has_summary, has_outline, has_highlights, has_keywords]):
        return []

    lines = ["## AI 解读", ""]
    if transcript.summary:
        lines.extend(["### 摘要", "", transcript.summary, ""])

    if isinstance(transcript.outline, list) and transcript.outline:
        lines.extend(["### 章节速览", ""])
        for item in transcript.outline:
            if not isinstance(item, dict):
                continue
            title = item.get("title") or "未命名章节"
            timestamp = _format_timestamp(item.get("start_sec", 0))
            lines.append(f"- **[{timestamp}] {title}**")
            for point in item.get("points") or []:
                lines.append(f"  - {point}")
        lines.append("")

    if isinstance(transcript.highlights, list) and transcript.highlights:
        lines.extend(["### 金句", ""])
        for item in transcript.highlights:
            if not isinstance(item, dict):
                continue
            timestamp = _format_timestamp(item.get("start_sec", 0))
            quote = item.get("quote") or ""
            speaker = f"（{item.get('speaker')}）" if item.get("speaker") else ""
            lines.append(f"- **[{timestamp}]**{speaker} {quote}")
        lines.append("")

    if isinstance(transcript.keywords, list) and transcript.keywords:
        lines.extend(["### 关键词", ""])
        for item in transcript.keywords:
            if not isinstance(item, dict):
                continue
            term = item.get("term") or ""
            explanation = item.get("explanation") or ""
            lines.append(f"- **{term}**：{explanation}")
        lines.append("")
    return lines


def _shownotes_section(episode: PodcastEpisode | None) -> list[str]:
    if not episode or not episode.shownotes_text:
        return []
    return ["## Shownotes", "", episode.shownotes_text, ""]


def _render_markdown(
    recording: Recording,
    transcript: Transcript,
    episode: PodcastEpisode | None,
) -> str:
    lines = [
        _frontmatter(recording, transcript, episode),
        f"# {recording.title}",
        "",
        *_info_section(recording, episode),
        *_shownotes_section(episode),
        "## 文字稿",
        "",
        *_segment_lines(transcript.segments, transcript.full_text),
        *_ai_section(transcript),
    ]
    return "\n".join(lines)


def export_recording_to_obsidian(
    recording: Recording,
    transcript: Transcript,
    episode: PodcastEpisode | None = None,
) -> dict:
    """本地部署（配了 vault）→ 直接写入 vault；生产（无本机 vault）→ 返回内容供前端下载。"""
    content = _render_markdown(recording, transcript, episode)
    date_prefix = recording.created_at.strftime("%Y-%m-%d")
    filename = f"{date_prefix} - {_safe_filename(recording.title)}.md"

    if settings.obsidian_vault_path:
        vault = Path(settings.obsidian_vault_path).expanduser().resolve()
        relative_dir = Path(settings.obsidian_export_dir)
        if (
            vault.exists()
            and not relative_dir.is_absolute()
            and ".." not in relative_dir.parts
        ):
            target_dir = (vault / relative_dir).resolve()
            if vault in target_dir.parents or target_dir == vault:
                target_dir.mkdir(parents=True, exist_ok=True)
                target = target_dir / filename
                target.write_text(content, encoding="utf-8")
                return {
                    "mode": "written",
                    "relative_path": str(target.relative_to(vault)),
                }

    return {"mode": "download", "filename": filename, "content": content}
