"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FileText,
  Import,
  Loader2,
  Plus,
  RefreshCw,
  Rss,
  Search,
  Youtube,
} from "lucide-react";
import {
  getPodcastEpisodes,
  getPodcastShows,
  importPodcastEpisode,
  refreshPodcastShows,
  searchPodcastShows,
  subscribePodcastShow,
  type PodcastEpisode,
  type PodcastSearchResult,
  type PodcastShow,
} from "@/lib/api";

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "日期未知";
}

function statusLabel(status: string) {
  return {
    not_requested: "未获取文字稿",
    transcribing: "转写中",
    uploading: "转写中",
    done: "已完成",
    failed: "失败",
  }[status] || status;
}

export default function PodcastPage() {
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [view, setView] = useState<"shows" | "episodes">("shows");
  const [mode, setMode] = useState<"subscribe" | "import" | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PodcastSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [subscribingFeed, setSubscribingFeed] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [showData, episodeData] = await Promise.all([
      getPodcastShows(),
      getPodcastEpisodes(),
    ]);
    setShows(showData);
    setEpisodes(episodeData);
  }, []);

  useEffect(() => {
    reload()
      .catch(() => setError("无法加载播客内容"))
      .finally(() => setLoading(false));
  }, [reload]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "subscribe") {
        const show = await subscribePodcastShow(url.trim());
        setMessage(`已订阅「${show.title}」，同步 ${show.episode_count} 集`);
      } else {
        const episode = await importPodcastEpisode(
          url.trim(),
          title.trim() || undefined
        );
        setMessage(`已导入「${episode.title}」，可在单集详情手动获取文字稿`);
        setView("episodes");
      }
      setUrl("");
      setTitle("");
      setMode(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!searchTerm.trim()) return;
    setSearching(true);
    setError(null);
    setMessage(null);
    try {
      const results = await searchPodcastShows(searchTerm.trim());
      setSearchResults(results);
      if (results.length === 0) {
        setMessage("没有找到可订阅的节目，可尝试粘贴 RSS 或小宇宙节目链接");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "节目搜索失败");
    } finally {
      setSearching(false);
    }
  };

  const handleSubscribeResult = async (result: PodcastSearchResult) => {
    if (!result.feed_url) return;
    setSubscribingFeed(result.feed_url);
    setError(null);
    setMessage(null);
    try {
      const show = await subscribePodcastShow(result.feed_url);
      setMessage(`已订阅「${show.title}」，同步 ${show.episode_count} 集`);
      setSearchResults((items) =>
        items.map((item) =>
          item.feed_url === result.feed_url
            ? { ...item, subscribed_show_id: show.id }
            : item
        )
      );
      await reload();
      setView("shows");
    } catch (err) {
      setError(err instanceof Error ? err.message : "订阅失败");
    } finally {
      setSubscribingFeed(null);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    setError(null);
    setMessage(null);
    try {
      const results = await refreshPodcastShows();
      const added = results.reduce((sum, item) => sum + item.added, 0);
      const failed = results.filter((item) => item.error).length;
      setMessage(
        `已获取最新订阅，新增 ${added} 集${failed ? `，${failed} 个节目刷新失败` : ""}`
      );
      await reload();
    } catch {
      setError("获取最新订阅失败");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-text">播客</h1>
          <p className="mt-1 text-[14px] text-text-dim">
            搜索播客与 YouTube，按需获取单集文字稿
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={
              refreshing || shows.every((show) => !show.is_subscribed)
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-hover bg-white px-4 text-[14px] font-medium text-text transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            获取最新订阅
          </button>
          <button
            onClick={() => setMode("import")}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-hover bg-white px-4 text-[14px] font-medium text-text hover:border-accent hover:text-accent"
          >
            <Import size={16} />
            导入单集
          </button>
          <button
            onClick={() => setMode("subscribe")}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-[14px] font-medium text-white hover:opacity-90"
          >
            <Plus size={16} />
            通过链接订阅
          </button>
        </div>
      </header>

      <section className="rounded-lg border border-border bg-white p-5">
        <form
          onSubmit={handleSearch}
          className="grid gap-3 md:grid-cols-[1fr_auto]"
        >
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索节目名称、作者或 YouTube 视频"
              className="h-11 w-full rounded-lg border border-border pl-11 pr-4 text-[14px] outline-none focus:border-accent"
            />
          </div>
          <button
            disabled={!searchTerm.trim() || searching}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-[14px] font-medium text-white disabled:opacity-40"
          >
            {searching && <Loader2 size={16} className="animate-spin" />}
            搜索节目
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            {searchResults.map((result) => (
              <div
                key={`${result.source_type}-${result.feed_url || result.source_url}`}
                className="grid gap-4 border-b border-border p-4 last:border-0 md:grid-cols-[1fr_auto]"
              >
                <SearchResultLink result={result} />
                <div className="flex items-center justify-end">
                  {result.source_type === "youtube_video" ? (
                    <a
                      href={result.source_url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center rounded-lg border border-border-hover px-4 text-[14px] font-medium text-text hover:border-accent hover:text-accent"
                    >
                      打开
                    </a>
                  ) : result.subscribed_show_id ? (
                    <Link
                      href={`/podcast/shows/${result.subscribed_show_id}`}
                      className="inline-flex h-10 items-center rounded-lg border border-border-hover px-4 text-[14px] font-medium text-text hover:border-accent hover:text-accent"
                    >
                      已订阅
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleSubscribeResult(result)}
                      disabled={subscribingFeed === result.feed_url}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-[14px] font-medium text-white disabled:opacity-40"
                    >
                      {subscribingFeed === result.feed_url && (
                        <Loader2 size={16} className="animate-spin" />
                      )}
                      订阅
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {mode && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-white p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">
              {mode === "subscribe" ? "订阅节目" : "导入单集"}
            </h2>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="text-[13px] text-text-dim hover:text-text"
            >
              取消
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={
                mode === "subscribe"
                  ? "RSS 地址或小宇宙节目主页链接"
                  : "单集网页链接或音频直链"
              }
              autoFocus
              className="h-11 rounded-lg border border-border px-4 text-[14px] outline-none focus:border-accent"
            />
            <button
              disabled={!url.trim() || submitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-[14px] font-medium text-white disabled:opacity-40"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {mode === "subscribe" ? "订阅并同步" : "导入"}
            </button>
          </div>
          {mode === "import" && (
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="标题（可选，留空自动读取）"
              className="mt-3 h-11 w-full rounded-lg border border-border px-4 text-[14px] outline-none focus:border-accent"
            />
          )}
          <p className="mt-3 text-[12px] text-text-muted">
            {mode === "subscribe"
              ? "首次默认同步最近 50 集；不会自动获取文字稿。"
              : "导入后不会立即转写，可在单集详情手动获取文字稿。"}
          </p>
        </form>
      )}

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-[13px] ${
            error
              ? "border-[#FFD6D9] bg-[#FFF4F5] text-[#C83B48]"
              : "border-[#CFE7D8] bg-[#F1FBF5] text-[#167A45]"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="flex border-b border-border">
        {[
          ["shows", `订阅节目 ${shows.filter((show) => show.is_subscribed).length}`],
          ["episodes", `全部单集 ${episodes.length}`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key as "shows" | "episodes")}
            className={`border-b-2 px-5 py-3 text-[14px] font-medium ${
              view === key
                ? "border-accent text-accent"
                : "border-transparent text-text-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24 text-text-dim">
          <Loader2 className="animate-spin" />
        </div>
      ) : view === "shows" ? (
        shows.length === 0 ? (
          <Empty icon={Rss} text="还没有订阅节目" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shows.map((show) => (
              <Link
                key={show.id}
                href={`/podcast/shows/${show.id}`}
                className="flex gap-4 rounded-lg border border-border bg-white p-4 transition-colors hover:border-accent"
              >
                <Cover src={show.cover_url} />
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-text">
                    {show.title}
                  </div>
                  <div className="mt-1 truncate text-[12px] text-text-dim">
                    {show.author || "作者未知"}
                  </div>
                  <div className="mt-4 text-[12px] text-text-muted">
                    {show.episode_count} 集 · {show.transcript_count} 篇文字稿
                  </div>
                  {!show.is_subscribed && (
                    <div className="mt-2 text-[12px] text-warning">已取消订阅</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )
      ) : episodes.length === 0 ? (
        <Empty icon={FileText} text="还没有播客单集" />
      ) : (
        <EpisodeList episodes={episodes} />
      )}
    </div>
  );
}

function SearchResultLink({ result }: { result: PodcastSearchResult }) {
  const content = (
    <>
      <Cover src={result.cover_url} sourceType={result.source_type} />
      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold text-text">
          {result.title}
        </div>
        <div className="mt-1 truncate text-[12px] text-text-dim">
          {result.author || "作者未知"}
        </div>
        <div className="mt-3 line-clamp-2 text-[12px] leading-5 text-text-muted">
          {result.description || "暂无简介"}
        </div>
        <div className="mt-2 text-[12px] text-text-muted">
          {result.source_label || "Podcast"}
          {result.episode_count ? ` · ${result.episode_count} 集` : ""}
          {result.published_at ? ` · ${formatDate(result.published_at)}` : ""}
        </div>
      </div>
    </>
  );

  if (result.source_type === "youtube_video") {
    return (
      <a
        href={result.source_url || "#"}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 gap-4 rounded-lg transition-colors hover:bg-surface"
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={
        result.subscribed_show_id
          ? `/podcast/shows/${result.subscribed_show_id}`
          : `/podcast/preview?url=${encodeURIComponent(result.feed_url || "")}`
      }
      className="flex min-w-0 gap-4 rounded-lg transition-colors hover:bg-surface"
    >
      {content}
    </Link>
  );
}

function Cover({
  src,
  sourceType = "podcast",
}: {
  src: string | null;
  sourceType?: PodcastSearchResult["source_type"] | "podcast";
}) {
  return src ? (
    <Image
      src={src}
      alt=""
      width={80}
      height={80}
      unoptimized
      className="h-20 w-20 shrink-0 rounded-lg object-cover"
    />
  ) : (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-accent-glow text-accent">
      {sourceType === "youtube_video" ? <Youtube size={24} /> : <Rss size={24} />}
    </div>
  );
}

function EpisodeList({ episodes }: { episodes: PodcastEpisode[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      {episodes.map((episode) => (
        <Link
          key={episode.id}
          href={`/podcast/episodes/${episode.id}`}
          className="grid gap-3 border-b border-border px-5 py-4 transition-colors last:border-0 hover:bg-surface md:grid-cols-[1fr_150px_130px]"
        >
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium text-text">
              {episode.title}
            </div>
            <div className="mt-1 truncate text-[12px] text-text-dim">
              {episode.show_title || "手动导入单集"}
            </div>
          </div>
          <div className="text-[12px] text-text-dim">
            {formatDate(episode.published_at)}
          </div>
          <div className="text-[12px] font-medium text-accent">
            {statusLabel(episode.recording_status)}
          </div>
        </Link>
      ))}
    </div>
  );
}

function Empty({
  icon: Icon,
  text,
}: {
  icon: typeof Rss;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-white py-20 text-text-muted">
      <Icon size={28} />
      <div className="mt-3 text-[14px]">{text}</div>
    </div>
  );
}
