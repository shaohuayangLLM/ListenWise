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


def _segment_lines(segments: list | dict | None, full_text: str | None) -> list[str]:
    if isinstance(segments, dict):
        segments = segments.get("segments", [])
    if isinstance(segments, list) and segments:
        lines = []
        for segment in segments:
            if not isinstance(segment, dict):
                continue
            timestamp = _format_timestamp(segment.get("start", 0))
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
    lines = [
        "---",
        f"title: {_yaml_value(recording.title)}",
        'source: "listenwise"',
        f"recording_id: {recording.id}",
        f"source_type: {_yaml_value(recording.source.value)}",
        f"status: {_yaml_value('已转录')}",
        f"created: {_yaml_value(recording.created_at.isoformat())}",
        f"date: {_yaml_value(_published_date(recording, episode))}",
        f"duration: {_format_duration_minutes(recording.duration)}",
    ]
    if show:
        lines.extend(
            [
                f"podcast: {_yaml_value(show.title)}",
                f"podcast_author: {_yaml_value(show.author)}",
            ]
        )
    if source_url:
        lines.append(f"source_url: {_yaml_value(source_url)}")
    if episode and episode.audio_url:
        lines.append(f"audio_url: {_yaml_value(episode.audio_url)}")
    if show and show.feed_url:
        lines.append(f"feed_url: {_yaml_value(show.feed_url)}")
    if transcript.summary_model:
        lines.append(f"summary_model: {_yaml_value(transcript.summary_model)}")
    if transcript.summary_at:
        lines.append(f"summary_at: {_yaml_value(transcript.summary_at.isoformat())}")
    lines.extend(["tags:", f"  - {_yaml_value('ListenWise')}"])
    if show:
        lines.append(f"  - {_yaml_value(f'播客/{show.title}')}")
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
        *_ai_section(transcript),
        *_shownotes_section(episode),
        "## 文字稿",
        "",
        *_segment_lines(transcript.segments, transcript.full_text),
    ]
    return "\n".join(lines)


def export_recording_to_obsidian(
    recording: Recording,
    transcript: Transcript,
    episode: PodcastEpisode | None = None,
) -> dict[str, str]:
    vault = Path(settings.obsidian_vault_path).expanduser().resolve()
    if not settings.obsidian_vault_path or not vault.exists():
        raise ValueError("未配置可用的 Obsidian vault 路径")

    relative_dir = Path(settings.obsidian_export_dir)
    if relative_dir.is_absolute() or ".." in relative_dir.parts:
        raise ValueError("Obsidian 导出目录配置不合法")

    target_dir = (vault / relative_dir).resolve()
    if vault not in target_dir.parents and target_dir != vault:
        raise ValueError("Obsidian 导出目录不在 vault 内")
    target_dir.mkdir(parents=True, exist_ok=True)

    date_prefix = recording.created_at.strftime("%Y-%m-%d")
    filename = f"{date_prefix} - {_safe_filename(recording.title)}.md"
    target = target_dir / filename

    target.write_text(_render_markdown(recording, transcript, episode), encoding="utf-8")

    return {
        "path": str(target),
        "relative_path": str(target.relative_to(vault)),
    }
