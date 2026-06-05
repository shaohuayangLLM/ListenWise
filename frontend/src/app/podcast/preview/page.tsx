"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Rss,
} from "lucide-react";
import {
  importPodcastEpisode,
  previewPodcastShow,
  subscribePodcastShow,
  transcribePodcastEpisode,
  type PodcastPreview,
  type PodcastPreviewEpisode,
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

function formatDuration(seconds: number) {
  if (!seconds) return "时长未知";
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${minutes} 分 ${remain} 秒`;
}

function PreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";
  const [preview, setPreview] = useState<PodcastPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setError("缺少节目链接");
      setLoading(false);
      return;
    }
    previewPodcastShow(url)
      .then(setPreview)
      .catch((err) => {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail;
        setError(detail || "无法加载节目详情");
      })
      .finally(() => setLoading(false));
  }, [url]);

  const subscribe = async () => {
    if (!url) return;
    setSubscribing(true);
    setError(null);
    try {
      const show = await subscribePodcastShow(url);
      router.push(`/podcast/shows/${show.id}`);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
      setError(detail || "订阅失败");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="mx-auto max-w-[1040px] py-20 text-center text-text-dim">
        {error || "节目不存在"}
      </div>
    );
  }

  const show = preview.show;

  return (
    <div className="mx-auto max-w-[1040px] space-y-6">
      <Link
        href="/podcast"
        className="inline-flex items-center gap-2 text-[13px] text-text-dim transition-colors duration-200 hover:text-accent"
      >
        <ArrowLeft size={16} />
        返回播客
      </Link>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-ring shadow-soft">
        <div className="flex flex-wrap items-start gap-5">
          {show.cover_url ? (
            <Image
              src={show.cover_url}
              alt=""
              width={112}
              height={112}
              unoptimized
              className="h-28 w-28 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg bg-accent-glow text-accent">
              <Rss size={32} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-serif text-[26px] font-semibold tracking-[-0.01em] text-text">{show.title}</h1>
                <p className="mt-1.5 text-[13px] text-text-dim">
                  {show.author || "作者未知"} · {show.total_available} 集
                </p>
              </div>
              {show.subscribed_show_id ? (
                <Link
                  href={`/podcast/shows/${show.subscribed_show_id}`}
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3.5 text-[13px] font-medium text-text-dim shadow-ring transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:border-accent hover:text-accent"
                >
                  已订阅，查看详情
                </Link>
              ) : (
                <button
                  onClick={subscribe}
                  disabled={subscribing}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:bg-accent-hover disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {subscribing ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Plus size={15} />
                  )}
                  订阅节目
                </button>
              )}
            </div>

            {show.description && (
              <p className="mt-4 line-clamp-5 whitespace-pre-line text-[13px] leading-6 text-text-dim">
                {show.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-text-muted">
              {show.feed_url && (
                <a
                  href={show.feed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-accent"
                >
                  RSS <ExternalLink size={12} />
                </a>
              )}
              {show.source_url && show.source_url !== show.feed_url && (
                <a
                  href={show.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-accent"
                >
                  原始页面 <ExternalLink size={12} />
                </a>
              )}
            </div>

            {show.sync_message && (
              <p className="mt-3 text-[12px] text-warning">{show.sync_message}</p>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-ring shadow-soft">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="font-serif text-[17px] font-semibold tracking-[-0.005em]">最近单集</h2>
        </div>
        {preview.episodes.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-text-muted">
            暂未读取到单集
          </div>
        ) : (
          preview.episodes.map((episode, index) => (
            <PreviewEpisodeRow key={`${episode.episode_url || episode.title}-${index}`} episode={episode} />
          ))
        )}
      </section>
    </div>
  );
}

function PreviewEpisodeRow({ episode }: { episode: PodcastPreviewEpisode }) {
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  const getTranscript = async () => {
    if (!episode.episode_url || working) return;
    if (
      !window.confirm(
        `获取「${episode.title}」的文字稿？无需订阅整个节目，这会导入这一集并调用 ASR 转写。`
      )
    )
      return;
    setWorking(true);
    setStatus("idle");
    try {
      const imported = await importPodcastEpisode(
        episode.episode_url,
        episode.title
      );
      await transcribePodcastEpisode(imported.id);
      setStatus("done");
    } catch {
      setStatus("error");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="grid items-center gap-3 border-b border-border px-5 py-4 last:border-0 md:grid-cols-[1fr_152px]">
      <div className="min-w-0">
        {episode.episode_url ? (
          <a
            href={episode.episode_url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-[14px] font-medium text-text transition-colors hover:text-accent"
          >
            {episode.title}
          </a>
        ) : (
          <div className="truncate text-[14px] font-medium text-text">
            {episode.title}
          </div>
        )}
        {episode.shownotes_text && (
          <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-text-muted">
            {episode.shownotes_text}
          </div>
        )}
        <div className="mt-1.5 text-[11px] tabular-nums text-text-muted">
          {formatDate(episode.published_at)} ·{" "}
          {formatDuration(episode.duration)}
        </div>
      </div>

      {episode.episode_url ? (
        <button
          onClick={getTranscript}
          disabled={working || status === "done"}
          title={
            status === "done"
              ? "已提交，转写完成后在「我的记录」查看"
              : undefined
          }
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-accent bg-accent-glow px-3.5 text-[12.5px] font-medium text-accent transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-accent hover:text-white disabled:opacity-50 disabled:hover:bg-accent-glow disabled:hover:text-accent md:justify-self-end"
        >
          {working ? (
            <Loader2 size={14} className="animate-spin" />
          ) : status === "done" ? (
            <Check size={14} />
          ) : (
            <FileText size={14} />
          )}
          {working
            ? "获取中"
            : status === "done"
              ? "已提交"
              : status === "error"
                ? "重试"
                : "获取文字稿"}
        </button>
      ) : (
        <span className="text-[12px] text-text-muted md:justify-self-end">
          无音频
        </span>
      )}
    </div>
  );
}

export default function PodcastPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-accent" />
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}
