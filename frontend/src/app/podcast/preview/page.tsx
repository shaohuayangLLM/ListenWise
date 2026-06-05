"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Plus,
  Rss,
} from "lucide-react";
import {
  previewPodcastShow,
  subscribePodcastShow,
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
        className="inline-flex items-center gap-2 text-[13px] text-text-dim hover:text-accent"
      >
        <ArrowLeft size={16} />
        返回播客
      </Link>

      <section className="rounded-lg border border-border bg-white p-6">
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
                <h1 className="text-[24px] font-bold text-text">{show.title}</h1>
                <p className="mt-1 text-[13px] text-text-dim">
                  {show.author || "作者未知"} · {show.total_available} 集
                </p>
              </div>
              {show.subscribed_show_id ? (
                <Link
                  href={`/podcast/shows/${show.subscribed_show_id}`}
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3.5 text-[13px] font-medium text-text-dim hover:border-accent hover:text-accent"
                >
                  已订阅，查看详情
                </Link>
              ) : (
                <button
                  onClick={subscribe}
                  disabled={subscribing}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white disabled:opacity-50"
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
        <div className="rounded-lg border border-[#FFD6D9] bg-[#FFF4F5] px-4 py-3 text-[13px] text-[#C83B48]">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[16px] font-semibold">最近单集</h2>
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
  const content = (
    <>
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium text-text">
          {episode.title}
        </div>
        {episode.shownotes_text && (
          <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-text-muted">
            {episode.shownotes_text}
          </div>
        )}
      </div>
      <div className="text-[12px] text-text-dim">
        {formatDate(episode.published_at)}
      </div>
      <div className="text-[12px] text-text-dim">
        {formatDuration(episode.duration)}
      </div>
    </>
  );

  if (!episode.episode_url) {
    return (
      <div className="grid gap-2 border-b border-border px-5 py-4 last:border-0 md:grid-cols-[1fr_150px_120px]">
        {content}
      </div>
    );
  }

  return (
    <a
      href={episode.episode_url}
      target="_blank"
      rel="noreferrer"
      className="grid gap-2 border-b border-border px-5 py-4 last:border-0 hover:bg-surface md:grid-cols-[1fr_150px_120px]"
    >
      {content}
    </a>
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
