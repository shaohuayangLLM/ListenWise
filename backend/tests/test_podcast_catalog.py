import json

import httpx
import pytest

from app.services import podcast_catalog


class FakeResponse:
    def __init__(self, *, content: bytes = b"", text: str = ""):
        self.content = content
        self.text = text


def test_text_duration_and_dedupe_helpers():
    assert podcast_catalog.html_to_text("<p>第一段</p><p>第二段</p>") == "第一段\n第二段"
    assert podcast_catalog.parse_duration("01:02:03") == 3723
    assert podcast_catalog.parse_duration("PT1H2M3S") == 3723
    assert podcast_catalog.dedupe_key("", " stable ") == podcast_catalog.dedupe_key(
        "stable"
    )


@pytest.mark.asyncio
async def test_fetch_rss_catalog_supports_limit_and_offset(monkeypatch):
    items = "".join(
        f"""
        <item>
          <title>Episode {index}</title>
          <guid>episode-{index}</guid>
          <description><![CDATA[<p>Shownotes {index}</p>]]></description>
          <enclosure url="https://example.com/{index}.mp3" type="audio/mpeg"/>
          <itunes:duration>{index}:00</itunes:duration>
        </item>
        """
        for index in range(60)
    )
    rss = f"""
    <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
      <channel><title>测试节目</title>{items}</channel>
    </rss>
    """.encode()

    async def fake_get(_url):
        return FakeResponse(content=rss)

    monkeypatch.setattr(podcast_catalog, "_get", fake_get)
    catalog = await podcast_catalog.fetch_rss_catalog(
        "https://example.com/feed.xml", limit=50, offset=5
    )

    assert catalog.show.title == "测试节目"
    assert catalog.total_available == 60
    assert len(catalog.episodes) == 50
    assert catalog.episodes[0].title == "Episode 5"
    assert catalog.episodes[-1].title == "Episode 54"
    assert catalog.episodes[0].shownotes_text == "Shownotes 5"


@pytest.mark.asyncio
async def test_xiaoyuzhou_feed_lookup_failure_falls_back_to_public_episodes(
    monkeypatch,
):
    podcast = {
        "pid": "show-1",
        "title": "测试小宇宙节目",
        "author": "作者",
        "description": "节目介绍",
        "episodes": [
            {
                "eid": "episode-1",
                "title": "公开单集",
                "shownotes": "<p>公开 shownotes</p>",
                "enclosure": {"url": "https://example.com/episode.mp3"},
            }
        ],
    }
    next_data = json.dumps({"props": {"pageProps": {"podcast": podcast}}})

    async def fake_get(_url):
        return FakeResponse(
            text=f'<script id="__NEXT_DATA__" type="application/json">{next_data}</script>'
        )

    async def failing_discover(_title, _author):
        request = httpx.Request("GET", "https://itunes.apple.com/search")
        raise httpx.ConnectError("network unavailable", request=request)

    monkeypatch.setattr(podcast_catalog, "_get", fake_get)
    monkeypatch.setattr(podcast_catalog, "_discover_feed", failing_discover)

    catalog = await podcast_catalog.fetch_xiaoyuzhou_catalog(
        "https://www.xiaoyuzhoufm.com/podcast/show-1"
    )

    assert catalog.show.source_limited is True
    assert catalog.show.sync_message
    assert len(catalog.episodes) == 1
    assert catalog.episodes[0].shownotes_text == "公开 shownotes"


@pytest.mark.asyncio
async def test_xiaoyuzhou_matched_feed_failure_falls_back_to_public_episodes(
    monkeypatch,
):
    podcast = {
        "pid": "show-1",
        "title": "测试小宇宙节目",
        "episodes": [{"eid": "episode-1", "title": "公开单集"}],
    }
    next_data = json.dumps({"props": {"pageProps": {"podcast": podcast}}})

    async def fake_get(url):
        if "xiaoyuzhoufm.com" in url:
            return FakeResponse(
                text=f'<script id="__NEXT_DATA__" type="application/json">{next_data}</script>'
            )
        request = httpx.Request("GET", url)
        raise httpx.RemoteProtocolError("feed unavailable", request=request)

    async def discover_feed(_title, _author):
        return "https://example.com/feed.xml"

    monkeypatch.setattr(podcast_catalog, "_get", fake_get)
    monkeypatch.setattr(podcast_catalog, "_discover_feed", discover_feed)

    catalog = await podcast_catalog.fetch_xiaoyuzhou_catalog(
        "https://www.xiaoyuzhoufm.com/podcast/show-1"
    )

    assert catalog.show.source_limited is True
    assert [episode.title for episode in catalog.episodes] == ["公开单集"]


@pytest.mark.asyncio
async def test_search_podcast_shows_maps_itunes_results(monkeypatch):
    class SearchResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "results": [
                    {
                        "collectionName": "测试节目",
                        "artistName": "作者",
                        "description": "节目简介",
                        "artworkUrl600": "https://example.com/cover.jpg",
                        "feedUrl": "https://example.com/feed.xml",
                        "collectionViewUrl": "https://podcasts.apple.com/podcast/id1",
                        "trackCount": 42,
                    },
                    {"collectionName": "缺少 RSS"},
                    {
                        "collectionName": "重复节目",
                        "feedUrl": "https://example.com/feed.xml",
                    },
                ]
            }

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def get(self, url, params):
            assert url == "https://itunes.apple.com/search"
            assert params["media"] == "podcast"
            assert params["entity"] == "podcast"
            assert params["country"] in {"CN", "US", "GB", "TW", "HK", "JP"}
            assert params["term"] == "测试"
            return SearchResponse()

    monkeypatch.setattr(podcast_catalog.httpx, "AsyncClient", FakeClient)

    results = await podcast_catalog.search_podcast_shows(" 测试 ", limit=12)

    assert len(results) == 1
    assert results[0].source_type == "podcast"
    assert results[0].title == "测试节目"
    assert results[0].author == "作者"
    assert results[0].feed_url == "https://example.com/feed.xml"
    assert results[0].episode_count == 42


@pytest.mark.asyncio
async def test_search_youtube_videos_maps_api_results(monkeypatch):
    class YouTubeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "items": [
                    {
                        "id": {"videoId": "video-1"},
                        "snippet": {
                            "title": "测试视频",
                            "description": "视频简介",
                            "channelTitle": "频道",
                            "publishedAt": "2026-06-05T00:00:00Z",
                            "thumbnails": {
                                "high": {"url": "https://example.com/high.jpg"}
                            },
                        },
                    },
                    {"id": {"channelId": "channel-1"}, "snippet": {"title": "频道"}},
                ]
            }

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def get(self, url, params):
            assert url == "https://www.googleapis.com/youtube/v3/search"
            assert params["part"] == "snippet"
            assert params["type"] == "video"
            assert params["key"] == "key"
            assert params["q"] == "测试"
            return YouTubeResponse()

    monkeypatch.setattr(podcast_catalog.httpx, "AsyncClient", FakeClient)

    results = await podcast_catalog.search_youtube_videos(" 测试 ", api_key="key")

    assert len(results) == 1
    assert results[0].source_type == "youtube_video"
    assert results[0].title == "测试视频"
    assert results[0].author == "频道"
    assert results[0].source_url == "https://www.youtube.com/watch?v=video-1"
    assert results[0].source_label == "YouTube"
