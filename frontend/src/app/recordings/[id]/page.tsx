"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import AudioPlayer, { type AudioPlayerHandle } from "@/components/AudioPlayer";
import TranscriptPanel from "@/components/TranscriptPanel";
import {
  exportTranscript,
  getRecordingDetail,
  mediaUrl,
  regenerateSummary,
  type RecordingDetail,
  type TranscriptSegment,
} from "@/lib/api";

const EXPORT_FORMATS = [
  { format: "md", label: "Markdown" },
  { format: "txt", label: "TXT" },
  { format: "srt", label: "SRT" },
  { format: "vtt", label: "VTT" },
];

const SPEAKER_COLORS: Record<string, string> = {
  A: "var(--accent)",
  B: "var(--accent-2)",
  C: "var(--accent-3)",
  D: "var(--warning)",
};

function speakerColor(s: string): string {
  return SPEAKER_COLORS[s.charAt(0).toUpperCase()] || "var(--text-dim)";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface SpeakerStat {
  speaker: string;
  name: string;
  segments: number;
}

function buildSpeakerStats(
  segments: TranscriptSegment[],
  labels: Record<string, string>
): SpeakerStat[] {
  const counts = new Map<string, number>();
  for (const seg of segments) {
    counts.set(seg.speaker, (counts.get(seg.speaker) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([speaker, n]) => ({
      speaker,
      name: labels[speaker] || speaker,
      segments: n,
    }));
}

export default function RecordingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [recording, setRecording] = useState<RecordingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [outlineExpanded, setOutlineExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayerHandle>(null);

  useEffect(() => {
    getRecordingDetail(Number(id))
      .then(setRecording)
      .catch(() => setError("无法加载录音详情"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSeek = (time: number) => {
    playerRef.current?.seekTo(time);
  };

  const handleGenerateSummary = async () => {
    if (!recording) return;
    setGenerating(true);
    setSummaryError(null);
    setSummaryOpen(true);
    try {
      const data = await regenerateSummary(recording.id);
      setRecording((prev) =>
        prev && prev.transcript
          ? { ...prev, transcript: { ...prev.transcript, ...data } }
          : prev
      );
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
      setSummaryError(detail || "生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const transcript = recording?.transcript ?? null;
  const speakerLabels = transcript?.speaker_labels ?? {};
  const speakers = transcript
    ? buildSpeakerStats(transcript.segments, speakerLabels)
    : [];
  const hasSummary = !!transcript?.summary || (transcript?.outline?.length ?? 0) > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-text-muted mb-4">{error || "录音不存在"}</p>
        <Link href="/" className="text-accent text-sm font-medium">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-surface-2 text-text-dim transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold truncate">{recording.title}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {EXPORT_FORMATS.map((item) => (
            <button
              key={item.format}
              onClick={() =>
                exportTranscript(
                  recording.id,
                  item.format,
                  `${recording.title}.${item.format}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface text-xs font-medium text-text-dim hover:border-accent hover:text-accent transition-colors"
            >
              <Download size={13} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audio Player */}
      {recording.file_url && (
        <AudioPlayer
          ref={playerRef}
          fileUrl={mediaUrl(recording.file_url)}
          onTimeUpdate={setCurrentTime}
        />
      )}

      {/* 说话人识别 */}
      {speakers.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <Users size={14} />
            识别到 {speakers.length} 位说话人
          </span>
          {speakers.map((sp) => (
            <span
              key={sp.speaker}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-surface text-xs"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: speakerColor(sp.speaker) }}
              />
              <span className="font-medium">{sp.name}</span>
              <span className="text-text-muted">{sp.segments} 段</span>
            </span>
          ))}
        </div>
      )}

      {/* AI 摘要（播客自动生成 / 上传手动触发）—— 可折叠 + 手动生成 */}
      {transcript && (
        <div className="mt-4 rounded-xl border border-[rgba(60,90,230,.16)] bg-[linear-gradient(160deg,#F4F7FE_0%,#EEF3FD_100%)] overflow-hidden">
          <div className="flex w-full items-center gap-2 px-5 py-4">
            <Sparkles size={16} className="text-accent" />
            <h2 className="text-base font-semibold">AI 摘要</h2>
            {transcript.summary_model && (
              <span className="text-[11px] text-text-muted">
                由 {transcript.summary_model} 生成
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={handleGenerateSummary}
                disabled={generating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(60,90,230,.3)] bg-white/70 px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-white disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
                  className={clsx(generating && "animate-spin")}
                />
                {generating
                  ? "生成中..."
                  : hasSummary
                    ? "重新生成"
                    : "生成 AI 摘要"}
              </button>
              <button
                onClick={() => setSummaryOpen((v) => !v)}
                className="p-1.5 text-text-muted"
                aria-label="折叠"
              >
                <ChevronDown
                  size={18}
                  className={clsx(
                    "transition-transform",
                    summaryOpen && "rotate-180"
                  )}
                />
              </button>
            </div>
          </div>

          {summaryOpen && (
            <div className="px-5 pb-5">
              {summaryError && (
                <p className="mb-3 text-sm font-medium text-[var(--accent-3)]">
                  {summaryError}
                </p>
              )}

              {!hasSummary && !generating && !summaryError && (
                <p className="py-2 text-sm text-text-muted">
                  尚未生成摘要，点击右上角「生成 AI 摘要」即可基于逐字稿提炼总结与章节。
                </p>
              )}

              {!hasSummary && generating && (
                <p className="py-2 text-sm text-text-muted">
                  正在分析逐字稿生成摘要，请稍候...
                </p>
              )}

              {transcript.summary && (
                <p className="mb-4 text-sm leading-relaxed text-text-dim">
                  {transcript.summary}
                </p>
              )}

              {(transcript?.outline?.length ?? 0) > 0 &&
                (() => {
                  const outline = transcript!.outline;
                  const COLLAPSED = 3;
                  const shown =
                    outlineExpanded || outline.length <= COLLAPSED
                      ? outline
                      : outline.slice(0, COLLAPSED);
                  return (
                    <div>
                      {shown.map((item, i) => {
                        const isLast =
                          i === shown.length - 1 &&
                          (outlineExpanded || outline.length <= COLLAPSED);
                        return (
                          <div key={i} className="flex gap-3">
                            {/* 时间戳 */}
                            <span className="w-12 shrink-0 pt-2 text-right font-mono text-xs text-text-muted">
                              {formatTime(item.start_sec)}
                            </span>
                            {/* 圆点 + 竖虚线 */}
                            <div className="flex w-3 shrink-0 flex-col items-center">
                              <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                              {!isLast && (
                                <span className="mt-1 w-px flex-1 border-l border-dashed border-[rgba(60,90,230,.3)]" />
                              )}
                            </div>
                            {/* 标题卡片 */}
                            <button
                              onClick={() => handleSeek(item.start_sec)}
                              className="group mb-2 flex-1 rounded-lg bg-white/70 px-4 py-2.5 text-left transition-colors hover:bg-white"
                            >
                              <span className="text-sm font-semibold text-text group-hover:text-accent">
                                {item.title}
                              </span>
                              {item.points?.length > 0 && (
                                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[13px] leading-relaxed text-text-dim">
                                  {item.points.map((p, j) => (
                                    <li key={j}>{p}</li>
                                  ))}
                                </ul>
                              )}
                            </button>
                          </div>
                        );
                      })}

                      {outline.length > COLLAPSED && (
                        <button
                          onClick={() => setOutlineExpanded((v) => !v)}
                          className="ml-[60px] mt-1 text-[13px] font-medium text-accent hover:underline"
                        >
                          {outlineExpanded
                            ? "收起章节"
                            : `展开全部章节（${outline.length}）`}
                        </button>
                      )}
                    </div>
                  );
                })()}
            </div>
          )}
        </div>
      )}

      {/* Transcript */}
      <div className="mt-4" style={{ height: "calc(100vh - 360px)" }}>
        <TranscriptPanel
          segments={transcript?.segments || []}
          wordCount={transcript?.word_count || 0}
          currentTime={currentTime}
          onSeek={handleSeek}
          speakerLabels={speakerLabels}
        />
      </div>
    </div>
  );
}
