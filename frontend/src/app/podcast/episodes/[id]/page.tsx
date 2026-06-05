"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Rss,
} from "lucide-react";
import {
  getPodcastEpisode,
  subscribePodcastShow,
  transcribePodcastEpisode,
  type PodcastEpisodeDetail,
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
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours} 小时 ${minutes} 分钟` : `${minutes} 分钟`;
}

export default function PodcastEpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const episodeId = Number(id);
  const [episode, setEpisode] = useState<PodcastEpisodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [activeTab, setActiveTab] = useState<"transcript" | "shownotes">(
    "shownotes"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const data = await getPodcastEpisode(episodeId);
    setEpisode(data);
    return data;
  }, [episodeId]);

  useEffect(() => {
    reload()
      .catch(() => setError("无法加载单集"))
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (!["uploading", "transcribing"].includes(episode?.recording_status || ""))
      return;
    const timer = window.setInterval(() => {
      reload().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [episode?.recording_status, reload]);

  const transcribe = async () => {
    setWorking(true);
    setError(null);
    try {
      await transcribePodcastEpisode(episodeId);
      setMessage("已开始获取文字稿");
      await reload();
    } catch {
      setError("无法获取文字稿，请检查音频地址或稍后重试");
    } finally {
      setWorking(false);
    }
  };

  const subscribeSuggested = async () => {
    if (!episode?.suggested_show_url) return;
    setWorking(true);
    setError(null);
    try {
      const show = await subscribePodcastShow(episode.suggested_show_url);
      setMessage(`已订阅「${show.title}」`);
      await reload();
    } catch {
      setError("订阅节目失败");
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );
  }
  if (!episode) {
    return <div className="py-20 text-center text-text-dim">单集不存在</div>;
  }

  const canTranscribe =
    episode.audio_url_available &&
    ["not_requested", "failed"].includes(episode.recording_status);
  const isTranscribing = ["uploading", "transcribing"].includes(
    episode.recording_status
  );

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <Link
        href={episode.show_id ? `/podcast/shows/${episode.show_id}` : "/podcast"}
        className="inline-flex items-center gap-2 text-[13px] text-text-dim transition-colors duration-200 hover:text-accent"
      >
        <ArrowLeft size={16} />
        返回播客
      </Link>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-ring shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-accent">
              {episode.show_title || "手动导入单集"}
            </div>
            <h1 className="mt-2 font-serif text-[27px] font-semibold leading-[1.28] tracking-[-0.01em] text-text">
              {episode.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-dim">
              <span>{formatDate(episode.published_at)}</span>
              <span>{formatDuration(episode.duration)}</span>
              {episode.episode_url && (
                <a
                  href={episode.episode_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition-colors duration-200 hover:text-accent"
                >
                  原始链接
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!episode.show_id && episode.suggested_show_url && (
              <button
                onClick={subscribeSuggested}
                disabled={working}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-[13px] font-medium text-text-dim shadow-ring transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-accent hover:text-accent disabled:opacity-50"
              >
                <Rss size={15} />
                订阅此节目
              </button>
            )}
            <button
              onClick={transcribe}
              disabled={!canTranscribe || working}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-[13px] font-medium text-white transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:bg-accent-hover disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {(working || isTranscribing) && (
                <Loader2 size={15} className="animate-spin" />
              )}
              {episode.recording_status === "done"
                ? "文字稿已获取"
                : isTranscribing
                  ? "正在获取文字稿"
                  : "获取文字稿"}
            </button>
          </div>
        </div>
        {!episode.audio_url_available && (
          <p className="mt-4 text-[12px] text-warning">
            该单集没有公开音频地址，暂时无法获取文字稿。
          </p>
        )}
      </section>

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-[13px] ${
            error
              ? "border-danger/30 bg-danger/10 text-danger"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="rounded-xl border border-border bg-surface shadow-ring shadow-soft">
        <div className="flex border-b border-border px-6">
          {[
            ["shownotes", "Shownotes"],
            ["transcript", "文字稿"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() =>
                setActiveTab(key as "transcript" | "shownotes")
              }
              className={`border-b-2 px-4 py-4 text-[14px] font-medium transition-colors duration-200 ${
                activeTab === key
                  ? "border-accent text-accent"
                  : "border-transparent text-text-dim hover:text-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {activeTab === "shownotes" ? (
          <div className="whitespace-pre-wrap px-6 py-6 font-serif text-[15px] leading-[1.74] text-text-dim">
            {episode.shownotes_text || episode.description || "暂无 shownotes"}
          </div>
        ) : episode.transcript ? (
          <div className="space-y-5 px-6 py-6">
            {episode.transcript.segments.map((segment, index) => (
              <div key={`${segment.start}-${index}`} className="leading-[1.74]">
                <span className="mr-3 text-[14px] font-semibold text-accent">
                  {episode.transcript?.speaker_labels?.[segment.speaker] ||
                    segment.speaker ||
                    "发言人"}
                </span>
                <span className="font-serif text-[15px] text-text">{segment.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-16 text-center text-[14px] text-text-muted">
            {isTranscribing ? "正在获取文字稿，请稍候…" : "尚未获取文字稿"}
          </div>
        )}
      </section>
    </div>
  );
}
