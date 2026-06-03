from datetime import datetime


def _format_duration(seconds: int) -> str:
    h, remainder = divmod(seconds, 3600)
    m, s = divmod(remainder, 60)
    if h > 0:
        return f"{h}小时{m}分钟"
    return f"{m}分钟{s}秒"


def _format_timestamp(ts: float) -> str:
    h, remainder = divmod(int(ts), 3600)
    m, s = divmod(remainder, 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def _format_srt_timestamp(ts: float) -> str:
    total_ms = int(ts * 1000)
    hours, remainder = divmod(total_ms, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, milliseconds = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"


def _format_vtt_timestamp(ts: float) -> str:
    return _format_srt_timestamp(ts).replace(",", ".")


def _segment_text(segment: dict, include_timestamps: bool) -> str:
    speaker = segment.get("speaker", "")
    text = segment.get("text", "")
    prefix = ""

    if include_timestamps:
        prefix = f"[{_format_timestamp(segment.get('start', 0))}] "
    if speaker:
        prefix += f"{speaker}: "

    return f"{prefix}{text}"


def _transcript_lines(segments: list | dict | None, full_text: str | None, include_timestamps: bool) -> list[str]:
    if isinstance(segments, dict):
        segments = segments.get("segments", [])

    if isinstance(segments, list) and segments:
        return [
            _segment_text(segment, include_timestamps)
            for segment in segments
            if isinstance(segment, dict)
        ]

    return [full_text] if full_text else ["暂无转写文本"]


def export_markdown(
    title: str,
    duration: int,
    created_at: datetime,
    transcript_segments: list | dict | None,
    transcript_full_text: str | None,
    include_timestamps: bool = True,
) -> bytes:
    lines = [
        f"# {title}",
        "",
        f"> 时长: {_format_duration(duration)}",
        f"> 创建时间: {created_at.strftime('%Y-%m-%d %H:%M')}",
        "",
        "## 转写文本",
        "",
        *_transcript_lines(transcript_segments, transcript_full_text, include_timestamps),
        "",
    ]
    return "\n".join(lines).encode("utf-8")


def export_text(
    transcript_segments: list | dict | None,
    transcript_full_text: str | None,
    include_timestamps: bool = False,
) -> bytes:
    return "\n".join(
        _transcript_lines(transcript_segments, transcript_full_text, include_timestamps)
    ).encode("utf-8")


def export_srt(transcript_segments: list | dict | None) -> bytes:
    if isinstance(transcript_segments, dict):
        transcript_segments = transcript_segments.get("segments", [])

    if not isinstance(transcript_segments, list):
        return b""

    blocks = []
    for index, segment in enumerate(transcript_segments, start=1):
        if not isinstance(segment, dict):
            continue
        start = _format_srt_timestamp(segment.get("start", 0))
        end = _format_srt_timestamp(segment.get("end", segment.get("start", 0)))
        blocks.append(f"{index}\n{start} --> {end}\n{_segment_text(segment, False)}")

    return "\n\n".join(blocks).encode("utf-8")


def export_vtt(transcript_segments: list | dict | None) -> bytes:
    if isinstance(transcript_segments, dict):
        transcript_segments = transcript_segments.get("segments", [])

    if not isinstance(transcript_segments, list):
        return b"WEBVTT\n\n"

    blocks = ["WEBVTT"]
    for segment in transcript_segments:
        if not isinstance(segment, dict):
            continue
        start = _format_vtt_timestamp(segment.get("start", 0))
        end = _format_vtt_timestamp(segment.get("end", segment.get("start", 0)))
        blocks.append(f"{start} --> {end}\n{_segment_text(segment, False)}")

    return "\n\n".join(blocks).encode("utf-8")
