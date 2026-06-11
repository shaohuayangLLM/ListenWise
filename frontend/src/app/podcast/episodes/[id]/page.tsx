"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Languages,
  ListChecks,
  Loader2,
  MessageCircle,
  Quote,
  Rss,
  Sparkles,
} from "lucide-react";
import {
  exportRecordingToObsidian,
  exportTranscript,
  getPodcastEpisode,
  subscribePodcastShow,
  transcribePodcastEpisode,
  type PodcastEpisodeDetail,
  type TranscriptSegment,
} from "@/lib/api";

type EpisodeTab = "shownotes" | "ai" | "transcript";

const EXPORT_FORMATS = [
  { format: "md", label: "Markdown" },
  { format: "txt", label: "TXT" },
  { format: "srt", label: "SRT" },
  { format: "vtt", label: "VTT" },
];

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

function formatTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function nearestSegmentIndex(segments: TranscriptSegment[], seconds: number) {
  if (segments.length === 0) return -1;
  let index = 0;
  for (let i = 0; i < segments.length; i += 1) {
    if (segments[i].start <= seconds) index = i;
    else break;
  }
  return index;
}

function speakerName(
  segment: TranscriptSegment,
  labels: Record<string, string> | undefined
) {
  return labels?.[segment.speaker] || segment.speaker || "发言人";
}

function TranscriptCard({
  segments,
  wordCount,
  speakerLabels,
  highlightedIndex,
  onPickSegment,
  dense = false,
}: {
  segments: TranscriptSegment[];
  wordCount: number;
  speakerLabels?: Record<string, string>;
  highlightedIndex: number | null;
  onPickSegment: (index: number) => void;
  dense?: boolean;
}) {
  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-ring shadow-soft">
      <div className="shrink-0 border-b border-border px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-[17px] font-semibold tracking-[-0.005em] text-text">
              文字稿
            </h2>
            <p className="mt-1 text-[11px] font-mono text-text-muted">
              共 {wordCount.toLocaleString()} 字
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-bg p-1 shadow-ring">
            <span className="rounded-md bg-surface px-2 py-1 text-[11px] font-medium text-accent shadow-ring">
              原文
            </span>
            <button
              disabled
              title="后续接入翻译任务后可启用"
              className="px-2 py-1 text-[11px] text-text-muted/60"
            >
              双语
            </button>
            <button
              disabled
              title="后续接入翻译任务后可启用"
              className="px-2 py-1 text-[11px] text-text-muted/60"
            >
              译文
            </button>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-bg px-2.5 py-1.5 text-[12px] text-text-dim shadow-ring">
          <Languages size={13} />
          翻译将作为阅读模式接入，不作为单独导出格式
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {segments.map((segment, index) => {
          const active = highlightedIndex === index;
          return (
            <button
              key={`${segment.start}-${index}`}
              data-episode-segment={index}
              onClick={() => onPickSegment(index)}
              className={clsx(
                "mb-1.5 w-full rounded-lg px-3 py-2.5 text-left transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)]",
                active
                  ? "bg-accent-glow shadow-[0_0_0_1px_var(--accent)]"
                  : "hover:bg-bg"
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-[12px] font-semibold text-accent">
                  {speakerName(segment, speakerLabels)}
                </span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-muted">
                  {formatTimestamp(segment.start)}
                </span>
              </div>
              <p
                className={clsx(
                  "font-serif leading-[1.72] text-text",
                  dense ? "text-[14px]" : "text-[15px]"
                )}
              >
                {segment.text}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<EpisodeTab>("shownotes");
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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

  const handleExportObsidian = async () => {
    if (!episode?.recording_id) return;
    setExportMessage(null);
    setExportError(null);
    try {
      const result = await exportRecordingToObsidian(episode.recording_id);
      setExportMessage(
        result.mode === "written"
          ? `已导出到 Obsidian：${result.relative_path}`
          : `已下载 Obsidian 文件：${result.filename}`
      );
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
      setExportError(detail || "导出到 Obsidian 失败");
    }
  };

  const transcript = episode?.transcript ?? null;
  const segments = transcript?.segments ?? [];
  const shownotesText = useMemo(
    () => episode?.shownotes_text || episode?.description || "",
    [episode?.description, episode?.shownotes_text]
  );
  const hasAi = Boolean(
    transcript?.summary ||
      transcript?.outline?.length ||
      transcript?.highlights?.length ||
      transcript?.keywords?.length
  );

  const locateTranscript = (seconds: number) => {
    const index = nearestSegmentIndex(segments, seconds);
    if (index < 0) return;
    setHighlightedIndex(index);
    setActiveTab("transcript");
    window.setTimeout(() => {
      document
        .querySelector(`[data-episode-segment="${index}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const pickSegment = (index: number) => {
    setHighlightedIndex(index);
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
  const canExport = Boolean(episode.recording_id && episode.recording_status === "done");

  return (
    <div className="mx-auto max-w-[1040px] space-y-6">
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
            <h1 className="mt-2 max-w-[820px] font-serif text-[27px] font-semibold leading-[1.28] tracking-[-0.01em] text-text">
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
            {canExport &&
              EXPORT_FORMATS.map((item) => (
                <button
                  key={item.format}
                  onClick={() =>
                    exportTranscript(
                      episode.recording_id!,
                      item.format,
                      `${episode.title}.${item.format}`
                    )
                  }
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[12px] font-mono text-text-dim shadow-ring transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-accent hover:text-accent"
                >
                  <Download size={13} />
                  {item.label}
                </button>
              ))}
            {canExport && (
              <button
                type="button"
                onClick={handleExportObsidian}
                title="导出到 Obsidian"
                aria-label="导出到 Obsidian"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-text-dim shadow-ring transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-accent hover:text-accent"
              >
                <FileDown size={15} />
              </button>
            )}
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
            {episode.recording_id && episode.recording_status === "done" && (
              <Link
                href={`/recordings/${episode.recording_id}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-[13px] font-medium text-text-dim shadow-ring transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-accent hover:text-accent"
              >
                <FileText size={15} />
                完整记录页
              </Link>
            )}
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

      {(exportMessage || exportError) && (
        <div
          className={`rounded-lg border px-4 py-3 text-[13px] ${
            exportError
              ? "border-danger/30 bg-danger/10 text-danger"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          {exportError || exportMessage}
        </div>
      )}

      <div className="grid gap-5">
        <section className="min-w-0 rounded-xl border border-border bg-surface shadow-ring shadow-soft">
          <div className="flex border-b border-border px-5">
            {[
              ["shownotes", "Shownotes"],
              ["ai", "AI 解读"],
              ["transcript", "文字稿"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as EpisodeTab)}
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

          {activeTab === "shownotes" && (
            <div className="whitespace-pre-wrap px-6 py-6 font-serif text-[15px] leading-[1.74] text-text-dim">
              {shownotesText || "暂无 shownotes"}
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-6 px-6 py-6">
              {!transcript ? (
                <div className="py-12 text-center text-[14px] text-text-muted">
                  获取文字稿后，可在这里查看 AI 解读。
                </div>
              ) : !hasAi ? (
                <div className="rounded-lg border border-border bg-bg px-4 py-4 text-[14px] leading-6 text-text-dim shadow-ring">
                  当前单集还没有 AI 解读。可以进入完整记录页手动生成摘要，生成后会回到这里展示。
                </div>
              ) : (
                <>
                  {transcript.summary && (
                    <section>
                      <div className="mb-2 inline-flex items-center gap-2 text-[12px] font-medium text-accent">
                        <Sparkles size={14} />
                        简介
                      </div>
                      <p className="font-serif text-[15px] leading-[1.76] text-text-dim">
                        {transcript.summary}
                      </p>
                    </section>
                  )}

                  {(transcript.outline?.length ?? 0) > 0 && (
                    <section>
                      <div className="mb-3 inline-flex items-center gap-2 text-[12px] font-medium text-accent">
                        <ListChecks size={14} />
                        要点
                      </div>
                      <div className="space-y-2">
                        {transcript.outline.map((item, index) => (
                          <button
                            key={`${item.start_sec}-${index}`}
                            onClick={() => locateTranscript(item.start_sec)}
                            className="group w-full rounded-lg bg-bg px-4 py-3 text-left shadow-ring transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:shadow-[0_0_0_1px_var(--accent)]"
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <span className="font-mono text-[12px] font-semibold text-accent">
                                {formatTimestamp(item.start_sec)}
                              </span>
                              <span className="font-serif text-[15px] font-semibold text-text group-hover:text-accent">
                                {item.title}
                              </span>
                            </div>
                            {item.points?.length > 0 && (
                              <ul className="list-disc space-y-0.5 pl-5 text-[13px] leading-6 text-text-muted">
                                {item.points.map((point, i) => (
                                  <li key={i}>{point}</li>
                                ))}
                              </ul>
                            )}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {(transcript.highlights?.length ?? 0) > 0 && (
                    <section>
                      <div className="mb-3 inline-flex items-center gap-2 text-[12px] font-medium text-accent">
                        <Quote size={14} />
                        金句
                      </div>
                      <div className="space-y-2">
                        {transcript.highlights.map((item, index) => (
                          <button
                            key={`${item.start_sec}-${index}`}
                            onClick={() => locateTranscript(item.start_sec)}
                            className="w-full rounded-lg border border-border bg-bg px-4 py-3 text-left shadow-ring transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-accent"
                          >
                            <p className="font-serif text-[15px] leading-[1.7] text-text">
                              {item.quote}
                            </p>
                            <div className="mt-2 font-mono text-[12px] text-text-muted">
                              {item.speaker ? `${item.speaker} · ` : ""}
                              {formatTimestamp(item.start_sec)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {(transcript.keywords?.length ?? 0) > 0 && (
                    <section>
                      <div className="mb-3 inline-flex items-center gap-2 text-[12px] font-medium text-accent">
                        <MessageCircle size={14} />
                        术语
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {transcript.keywords.map((item) => (
                          <div
                            key={item.term}
                            className="rounded-lg bg-bg px-4 py-3 shadow-ring"
                          >
                            <div className="text-[14px] font-semibold text-text">
                              {item.term}
                            </div>
                            <p className="mt-1 text-[13px] leading-6 text-text-dim">
                              {item.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "transcript" &&
            (transcript ? (
              <div className="h-[calc(100vh-260px)] min-h-[520px] p-4">
                <TranscriptCard
                  segments={segments}
                  wordCount={transcript.word_count}
                  speakerLabels={transcript.speaker_labels}
                  highlightedIndex={highlightedIndex}
                  onPickSegment={pickSegment}
                />
              </div>
            ) : (
              <div className="px-6 py-16 text-center text-[14px] text-text-muted">
                {isTranscribing ? "正在获取文字稿，请稍候…" : "尚未获取文字稿"}
              </div>
            ))}
        </section>

      </div>
    </div>
  );
}
