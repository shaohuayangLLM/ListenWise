"""播客节目源与单集元数据解析。"""

import asyncio
import hashlib
import json
import re
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from time import struct_time

import feedparser
import httpx

_AUDIO_EXT = re.compile(r"\.(mp3|m4a|wav|aac|flac|ogg)(\?|$)", re.I)
_XYZ_SHOW = re.compile(r"xiaoyuzhoufm\.com/podcast/([a-zA-Z0-9]+)")
_XYZ_EPISODE = re.compile(r"xiaoyuzhoufm\.com/episode/([a-zA-Z0-9]+)")
_NEXT_DATA = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S
)


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str):
        value = data.strip()
        if value:
            self.parts.append(value)


def html_to_text(value: str | None) -> str:
    if not value:
        return ""
    parser = _TextExtractor()
    parser.feed(value)
    return "\n".join(parser.parts)


def parse_duration(value) -> int:
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip().upper()
    if text.isdigit():
        return int(text)
    if text.startswith("PT"):
        hours = re.search(r"(\d+)H", text)
        minutes = re.search(r"(\d+)M", text)
        seconds = re.search(r"(\d+)S", text)
        return (
            int(hours.group(1)) * 3600 if hours else 0
        ) + (
            int(minutes.group(1)) * 60 if minutes else 0
        ) + (
            int(seconds.group(1)) if seconds else 0
        )
    parts = text.split(":")
    try:
        nums = [int(part) for part in parts]
    except ValueError:
        return 0
    if len(nums) == 3:
        return nums[0] * 3600 + nums[1] * 60 + nums[2]
    if len(nums) == 2:
        return nums[0] * 60 + nums[1]
    return 0


def _datetime_from_struct(value: struct_time | None) -> datetime | None:
    if not value:
        return None
    return datetime(*value[:6], tzinfo=timezone.utc)


def _datetime_from_text(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            return parsedate_to_datetime(value)
        except (TypeError, ValueError):
            return None


def dedupe_key(*values: str | None) -> str:
    stable = next((v.strip() for v in values if v and v.strip()), "")
    return hashlib.sha256(stable.encode("utf-8")).hexdigest()


@dataclass
class ShowMeta:
    title: str
    author: str | None
    description: str | None
    cover_url: str | None
    source_type: str
    source_url: str
    feed_url: str | None = None
    external_id: str | None = None
    source_limited: bool = False
    sync_message: str | None = None


@dataclass
class EpisodeMeta:
    title: str
    dedupe_key: str
    external_id: str | None = None
    description: str | None = None
    shownotes_html: str | None = None
    shownotes_text: str | None = None
    episode_url: str | None = None
    audio_url: str | None = None
    cover_url: str | None = None
    published_at: datetime | None = None
    duration: int = 0
    suggested_show_url: str | None = None


@dataclass
class Catalog:
    show: ShowMeta
    episodes: list[EpisodeMeta]
    total_available: int


@dataclass
class PodcastSearchResult:
    source_type: str
    title: str
    author: str | None
    description: str | None
    cover_url: str | None
    feed_url: str | None
    source_url: str | None
    episode_count: int | None
    source_label: str | None = None
    published_at: datetime | None = None


async def _get(url: str) -> httpx.Response:
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
    response.raise_for_status()
    return response


def _entry_audio(entry) -> str | None:
    for enclosure in entry.get("enclosures", []):
        if enclosure.get("href"):
            return enclosure["href"]
    for link in entry.get("links", []):
        if link.get("rel") == "enclosure" and link.get("href"):
            return link["href"]
    return None


def _entry_image(entry, feed) -> str | None:
    image = entry.get("image") or entry.get("itunes_image") or feed.get("image")
    if isinstance(image, dict):
        return image.get("href") or image.get("url")
    return image if isinstance(image, str) else None


async def fetch_rss_catalog(
    feed_url: str,
    *,
    source_url: str | None = None,
    source_type: str = "rss",
    external_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> Catalog:
    response = await _get(feed_url)
    parsed = feedparser.parse(response.content)
    feed = parsed.feed
    title = feed.get("title")
    if not title:
        raise ValueError("无法识别该 RSS 节目")

    show = ShowMeta(
        title=title,
        author=feed.get("author"),
        description=html_to_text(feed.get("description") or feed.get("subtitle")),
        cover_url=_entry_image({}, feed),
        source_type=source_type,
        source_url=source_url or feed_url,
        feed_url=feed_url,
        external_id=external_id,
    )

    episodes: list[EpisodeMeta] = []
    for entry in parsed.entries[offset : offset + limit]:
        audio_url = _entry_audio(entry)
        episode_url = entry.get("link")
        external = entry.get("id") or entry.get("guid")
        content = entry.get("content") or []
        shownotes_html = (
            content[0].get("value")
            if content and isinstance(content[0], dict)
            else entry.get("summary")
        )
        episodes.append(
            EpisodeMeta(
                title=entry.get("title") or "未命名单集",
                dedupe_key=dedupe_key(audio_url, episode_url, external),
                external_id=external,
                description=html_to_text(entry.get("summary")),
                shownotes_html=shownotes_html,
                shownotes_text=html_to_text(shownotes_html),
                episode_url=episode_url,
                audio_url=audio_url,
                cover_url=_entry_image(entry, feed),
                published_at=_datetime_from_struct(
                    entry.get("published_parsed") or entry.get("updated_parsed")
                ),
                duration=parse_duration(
                    entry.get("itunes_duration") or entry.get("duration")
                ),
            )
        )
    return Catalog(show=show, episodes=episodes, total_available=len(parsed.entries))


async def _discover_feed(title: str, author: str | None) -> str | None:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://itunes.apple.com/search",
            params={"media": "podcast", "entity": "podcast", "limit": 20, "term": title},
        )
    response.raise_for_status()
    results = response.json().get("results", [])
    exact = [
        item
        for item in results
        if item.get("collectionName", "").strip().casefold() == title.strip().casefold()
        and item.get("feedUrl")
    ]
    if not exact:
        return None
    if author:
        author_match = next(
            (
                item
                for item in exact
                if item.get("artistName", "").strip().casefold()
                == author.strip().casefold()
            ),
            None,
        )
        if author_match:
            return author_match["feedUrl"]
    return exact[0]["feedUrl"]


def _feed_platform(feed_url: str) -> tuple[str, int]:
    """按 feed 域名判断平台与排序优先级（越小越靠前）：小宇宙 > Apple/其他 > 喜马拉雅。"""
    f = (feed_url or "").lower()
    if "xyzfm.space" in f or "xiaoyuzhoufm" in f or "xyzcdn" in f:
        return ("小宇宙", 0)
    if "ximalaya" in f:
        return ("喜马拉雅", 2)
    return ("Apple Podcasts", 1)


async def search_podcast_shows(term: str, *, limit: int = 12) -> list[PodcastSearchResult]:
    keyword = term.strip()
    if not keyword:
        return []

    countries = ["CN", "US", "GB", "TW", "HK", "JP"]
    per_country = max(4, min(20, limit))
    async with httpx.AsyncClient(timeout=20) as client:
        responses = await asyncio.gather(
            *[
                client.get(
                    "https://itunes.apple.com/search",
                    params={
                        "term": keyword,
                        "country": country,
                        "media": "podcast",
                        "entity": "podcast",
                        "limit": per_country,
                    },
                )
                for country in countries
            ]
        )
    for response in responses:
        response.raise_for_status()

    results: list[PodcastSearchResult] = []
    seen_feeds: set[str] = set()
    for response in responses:
        for item in response.json().get("results", []):
            feed_url = (item.get("feedUrl") or "").strip()
            title = item.get("collectionName") or item.get("trackName")
            if not feed_url or not title or feed_url in seen_feeds:
                continue
            seen_feeds.add(feed_url)
            platform, _ = _feed_platform(feed_url)
            results.append(
                PodcastSearchResult(
                    source_type="podcast",
                    title=title,
                    author=item.get("artistName"),
                    description=item.get("description"),
                    cover_url=item.get("artworkUrl600") or item.get("artworkUrl100"),
                    feed_url=feed_url,
                    source_url=item.get("collectionViewUrl") or item.get("trackViewUrl"),
                    episode_count=item.get("trackCount"),
                    source_label=platform,
                )
            )
    # 以小宇宙为主：小宇宙 > Apple/其他 > 喜马拉雅
    results.sort(key=lambda r: _feed_platform(r.feed_url or "")[1])
    return results[:limit]


async def search_youtube_videos(
    term: str,
    *,
    api_key: str,
    limit: int = 8,
) -> list[PodcastSearchResult]:
    keyword = term.strip()
    if not keyword or not api_key:
        return []

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": keyword,
                "type": "video",
                "maxResults": limit,
                "key": api_key,
            },
        )
    response.raise_for_status()

    results: list[PodcastSearchResult] = []
    for item in response.json().get("items", []):
        video_id = (item.get("id") or {}).get("videoId")
        snippet = item.get("snippet") or {}
        title = snippet.get("title")
        if not video_id or not title:
            continue
        thumbnails = snippet.get("thumbnails") or {}
        image = (
            thumbnails.get("high")
            or thumbnails.get("medium")
            or thumbnails.get("default")
            or {}
        )
        results.append(
            PodcastSearchResult(
                source_type="youtube_video",
                title=title,
                author=snippet.get("channelTitle"),
                description=snippet.get("description"),
                cover_url=image.get("url"),
                feed_url=None,
                source_url=f"https://www.youtube.com/watch?v={video_id}",
                episode_count=None,
                source_label="YouTube",
                published_at=_datetime_from_text(snippet.get("publishedAt")),
            )
        )
    return results


def _xyz_episode(item: dict, show_url: str) -> EpisodeMeta:
    audio_url = (
        item.get("enclosure", {}).get("url")
        or item.get("media", {}).get("source", {}).get("url")
    )
    episode_url = (
        f"https://www.xiaoyuzhoufm.com/episode/{item['eid']}"
        if item.get("eid")
        else None
    )
    image = item.get("image") or {}
    shownotes = item.get("shownotes") or item.get("description")
    return EpisodeMeta(
        title=item.get("title") or "未命名单集",
        dedupe_key=dedupe_key(audio_url, episode_url, item.get("eid")),
        external_id=item.get("eid"),
        description=item.get("description"),
        shownotes_html=item.get("shownotes"),
        shownotes_text=html_to_text(shownotes),
        episode_url=episode_url,
        audio_url=audio_url,
        cover_url=image.get("picUrl"),
        published_at=_datetime_from_text(item.get("pubDate")),
        duration=parse_duration(item.get("duration")),
        suggested_show_url=show_url,
    )


async def fetch_xiaoyuzhou_catalog(
    show_url: str, *, limit: int = 50, offset: int = 0
) -> Catalog:
    response = await _get(show_url)
    match = _NEXT_DATA.search(response.text)
    if not match:
        raise ValueError("无法解析小宇宙节目主页")
    page = json.loads(match.group(1))
    podcast = page["props"]["pageProps"]["podcast"]
    pid = podcast.get("pid") or _XYZ_SHOW.search(show_url).group(1)
    try:
        feed_url = await _discover_feed(podcast["title"], podcast.get("author"))
    except httpx.HTTPError:
        feed_url = None
    if feed_url:
        try:
            catalog = await fetch_rss_catalog(
                feed_url,
                source_url=show_url,
                source_type="xiaoyuzhou",
                external_id=pid,
                limit=limit,
                offset=offset,
            )
        except (httpx.HTTPError, ValueError):
            feed_url = None
        else:
            catalog.show = replace(
                catalog.show,
                title=podcast["title"],
                author=podcast.get("author"),
                description=podcast.get("description"),
                cover_url=(podcast.get("image") or {}).get("picUrl"),
            )
            return catalog

    public_episodes = podcast.get("episodes", [])
    episodes = [
        _xyz_episode(item, show_url)
        for item in public_episodes[offset : offset + limit]
    ]
    return Catalog(
        show=ShowMeta(
            title=podcast["title"],
            author=podcast.get("author"),
            description=podcast.get("description"),
            cover_url=(podcast.get("image") or {}).get("picUrl"),
            source_type="xiaoyuzhou",
            source_url=show_url,
            external_id=pid,
            source_limited=True,
            sync_message="未匹配到标准 RSS，仅同步小宇宙公开页面可获取的最近单集",
        ),
        episodes=episodes,
        total_available=len(public_episodes),
    )


async def fetch_catalog(url: str, *, limit: int = 50, offset: int = 0) -> Catalog:
    if _XYZ_SHOW.search(url):
        return await fetch_xiaoyuzhou_catalog(url, limit=limit, offset=offset)
    return await fetch_rss_catalog(url, limit=limit, offset=offset)


def _json_ld_episode(html: str) -> dict | None:
    scripts = re.findall(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S
    )
    for raw in scripts:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if data.get("@type") == "PodcastEpisode":
            return data
    return None


def _meta(html: str, name: str) -> str | None:
    patterns = [
        rf'<meta[^>]+(?:property|name)="{re.escape(name)}"[^>]+content="([^"]*)"',
        rf'<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="{re.escape(name)}"',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.I)
        if match:
            return match.group(1)
    return None


async def import_episode(url: str, title: str | None = None) -> EpisodeMeta:
    if _AUDIO_EXT.search(url):
        return EpisodeMeta(
            title=title or url.rsplit("/", 1)[-1].split("?")[0] or "播客单集",
            dedupe_key=dedupe_key(url),
            audio_url=url,
            episode_url=url,
        )

    response = await _get(url)
    data = _json_ld_episode(response.text)
    if data:
        media = data.get("associatedMedia") or {}
        series = data.get("partOfSeries") or {}
        audio_url = media.get("contentUrl") or _meta(response.text, "og:audio")
        return EpisodeMeta(
            title=title or data.get("name") or "播客单集",
            dedupe_key=dedupe_key(audio_url, url),
            external_id=(_XYZ_EPISODE.search(url).group(1) if _XYZ_EPISODE.search(url) else None),
            description=data.get("description"),
            shownotes_text=data.get("description"),
            episode_url=data.get("url") or url,
            audio_url=audio_url,
            cover_url=_meta(response.text, "og:image"),
            published_at=_datetime_from_text(data.get("datePublished")),
            duration=parse_duration(data.get("timeRequired")),
            suggested_show_url=series.get("url"),
        )

    audio_url = _meta(response.text, "og:audio")
    if not audio_url:
        raise ValueError("无法从该链接解析出播客音频地址")
    description = _meta(response.text, "og:description")
    return EpisodeMeta(
        title=title or _meta(response.text, "og:title") or "播客单集",
        dedupe_key=dedupe_key(audio_url, url),
        description=description,
        shownotes_text=description,
        episode_url=url,
        audio_url=audio_url,
        cover_url=_meta(response.text, "og:image"),
    )
