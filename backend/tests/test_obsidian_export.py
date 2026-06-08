from datetime import datetime, timezone

from app.models.base import RecordingSource, RecordingStatus, SceneType
from app.models.podcast import PodcastEpisode, PodcastShow
from app.models.recording import Recording
from app.models.transcript import Transcript
from app.services import obsidian_export


def test_export_podcast_recording_includes_metadata_and_ai_sections(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(obsidian_export.settings, "obsidian_vault_path", str(tmp_path))
    monkeypatch.setattr(obsidian_export.settings, "obsidian_export_dir", "ListenWise")

    created_at = datetime(2026, 6, 5, 8, 30, tzinfo=timezone.utc)
    recording = Recording(
        id=17,
        user_id=1,
        title="测试播客单集",
        file_url="https://example.com/audio.mp3",
        original_filename="audio.mp3",
        scene_type=SceneType.study_recording,
        source=RecordingSource.podcast,
        source_url="https://example.com/episode",
        status=RecordingStatus.done,
        duration=3600,
    )
    recording.created_at = created_at
    recording.updated_at = created_at

    transcript = Transcript(
        id=1,
        recording_id=17,
        full_text="完整文字稿",
        word_count=4,
        segments=[{"start": 3, "speaker": "A", "text": "第一句话"}],
        summary="这是一段 AI 摘要。",
        outline=[
            {
                "title": "开场",
                "start_sec": 3,
                "points": ["介绍主题"],
            }
        ],
        highlights=[{"quote": "值得保留的一句话", "start_sec": 3, "speaker": "A"}],
        keywords=[{"term": "系统论", "explanation": "一种分析框架"}],
        summary_model="qwen-plus",
        summary_at=created_at,
    )

    show = PodcastShow(
        id=5,
        user_id=1,
        title="十分吸引",
        author="敏-姐",
        source_type="rss",
        source_url="https://example.com/show",
        feed_url="https://example.com/feed.xml",
    )
    episode = PodcastEpisode(
        id=10,
        user_id=1,
        show=show,
        recording_id=17,
        dedupe_key="abc",
        title="测试播客单集",
        episode_url="https://example.com/episode",
        audio_url="https://example.com/audio.mp3",
        shownotes_text="这里是 shownotes",
        published_at=created_at,
    )

    result = obsidian_export.export_recording_to_obsidian(
        recording, transcript, episode
    )
    output = (tmp_path / result["relative_path"]).read_text(encoding="utf-8")

    assert 'podcast: "十分吸引"' in output
    assert 'source_url: "https://example.com/episode"' in output
    assert "- 原始链接：[链接](https://example.com/episode)" in output
    assert "## AI 解读" in output
    assert "这是一段 AI 摘要。" in output
    assert "**[00:00:03] 开场**" in output
    assert "## Shownotes" in output
    assert "这里是 shownotes" in output
    assert "## 文字稿" in output
    assert "**[00:00:03]** **A** 第一句话" in output
