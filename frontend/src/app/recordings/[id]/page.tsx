"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileDown,
  Loader2,
  Pencil,
  PenLine,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import AudioPlayer, { type AudioPlayerHandle } from "@/components/AudioPlayer";
import TranscriptPanel from "@/components/TranscriptPanel";
import {
  exportRecordingToObsidian,
  exportTranscript,
  getRecordingDetail,
  mediaUrl,
  regenerateSummary,
  updateRecording,
  updateSpeakerLabels,
  type RecordingDetail,
  type TranscriptSegment,
} from "@/lib/api";

function tabClass(active: boolean): string {
  return (
    "inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors " +
    (active
      ? "border-accent text-accent"
      : "border-transparent text-text-muted hover:text-text")
  );
}

const EXPORT_FORMATS = [
  { format: "md", label: "Markdown" },
  { format: "txt", label: "TXT" },
  { format: "srt", label: "SRT" },
  { format: "vtt", label: "VTT" },
];

const SPEAKER_COLORS: Record<string, string> = {
  A: "var(--accent)",
  B: "var(--text-muted)",
  C: "var(--accent-2)",
  D: "var(--accent-hover)",
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
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [activeTab, setActiveTab] = useState<"transcript" | "notes">("transcript");
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const playerRef = useRef<AudioPlayerHandle>(null);

  useEffect(() => {
    getRecordingDetail(Number(id))
      .then(setRecording)
      .catch(() => setError("无法加载录音详情"))
      .finally(() => setLoading(false));
  }, [id]);

  // 笔记草稿随记录加载/外部更新同步
  useEffect(() => {
    setNoteDraft(recording?.note ?? "");
  }, [recording?.note]);

  const handleSaveNote = async () => {
    if (!recording) return;
    setSavingNote(true);
    try {
      await updateRecording(recording.id, { note: noteDraft });
      setRecording((prev) => (prev ? { ...prev, note: noteDraft } : prev));
    } finally {
      setSavingNote(false);
    }
  };

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

  const handleExportObsidian = async () => {
    if (!recording) return;
    setExportMessage(null);
    setExportError(null);
    try {
      const result = await exportRecordingToObsidian(recording.id);
      setExportMessage(
        result.mode === "written"
          ? `已导出到 Obsidian：${result.relative_path}`
          : `已下载 Obsidian 文件：${result.filename}（拖进你的 vault 即可）`
      );
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail;
      setExportError(detail || "导出到 Obsidian 失败");
    }
  };

  const transcript = recording?.transcript ?? null;
  const speakerLabels = transcript?.speaker_labels ?? {};
  const speakers = transcript
    ? buildSpeakerStats(transcript.segments, speakerLabels)
    : [];
  const hasSummary = !!transcript?.summary || (transcript?.outline?.length ?? 0) > 0;

  const startRenameSpeaker = (sp: SpeakerStat) => {
    setEditingSpeaker(sp.speaker);
    // 默认名（A/B/C）时清空让用户直接输入真名
    setEditName(sp.name === sp.speaker ? "" : sp.name);
  };

  const saveRenameSpeaker = async (speaker: string) => {
    const name = editName.trim();
    setEditingSpeaker(null);
    const current = speakerLabels[speaker] || "";
    if (name === current) return;
    const labels = { ...speakerLabels };
    if (name) labels[speaker] = name;
    else delete labels[speaker];
    setRecording((prev) =>
      prev && prev.transcript
        ? { ...prev, transcript: { ...prev.transcript, speaker_labels: labels } }
        : prev
    );
    try {
      if (recording) await updateSpeakerLabels(recording.id, labels);
    } catch {
      // 失败则重新拉取恢复
      getRecordingDetail(Number(id)).then(setRecording);
    }
  };

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
            className="p-2 rounded-lg hover:bg-surface-2 text-text-dim hover:text-accent transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-serif text-2xl font-semibold tracking-tight truncate">{recording.title}</h1>
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface shadow-ring text-xs font-mono text-text-dim hover:text-accent hover:shadow-[0_0_0_1px_var(--accent)] transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)]"
            >
              <Download size={13} />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleExportObsidian}
            disabled={recording.status !== "done" || !recording.transcript}
            title={
              recording.status === "done" && recording.transcript
                ? "导出到 Obsidian"
                : "转写完成后可导出到 Obsidian"
            }
            aria-label="导出到 Obsidian"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface shadow-ring text-text-dim transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:text-accent hover:shadow-[0_0_0_1px_var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-text-dim disabled:hover:shadow-ring"
          >
            <FileDown size={14} />
          </button>
        </div>
      </div>

      {(exportMessage || exportError) && (
        <div
          className={clsx(
            "mb-4 rounded-lg px-4 py-3 text-[13px] shadow-ring",
            exportError
              ? "bg-surface text-danger"
              : "bg-surface text-success"
          )}
        >
          {exportError || exportMessage}
        </div>
      )}

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
              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface shadow-ring text-xs"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: speakerColor(sp.speaker) }}
              />
              {editingSpeaker === sp.speaker ? (
                <input
                  value={editName}
                  autoFocus
                  placeholder={sp.speaker}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => saveRenameSpeaker(sp.speaker)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRenameSpeaker(sp.speaker);
                    if (e.key === "Escape") setEditingSpeaker(null);
                  }}
                  className="w-20 rounded border border-accent bg-bg px-1 py-0.5 text-xs text-text focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => startRenameSpeaker(sp)}
                  title="点击重命名说话人"
                  className="inline-flex items-center gap-1 font-medium transition-colors hover:text-accent"
                >
                  {sp.name}
                  <Pencil
                    size={11}
                    className="opacity-0 transition-opacity group-hover:opacity-60"
                  />
                </button>
              )}
              <span className="text-text-muted font-mono tabular-nums">{sp.segments} 段</span>
            </span>
          ))}
        </div>
      )}

      {/* AI 摘要（播客自动生成 / 上传手动触发）—— 可折叠 + 手动生成 */}
      {transcript && (
        <div className="mt-4 rounded-xl bg-surface shadow-ring shadow-soft overflow-hidden">
          <div className="flex w-full items-baseline gap-2.5 px-6 py-5">
            <Sparkles size={16} className="text-accent self-center" />
            <h2 className="font-serif text-lg font-semibold tracking-tight">AI 摘要</h2>
            {transcript.summary_model && (
              <span className="text-[11px] text-text-muted font-mono px-2 py-0.5 rounded bg-bg shadow-ring self-center">
                由 {transcript.summary_model} 生成
              </span>
            )}
            <div className="ml-auto flex items-center gap-1 self-center">
              <button
                onClick={handleGenerateSummary}
                disabled={generating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-bg shadow-ring px-2.5 py-1.5 text-xs font-medium text-accent transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:shadow-[0_0_0_1px_var(--accent)] disabled:opacity-50"
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
            <div className="px-6 pb-6">
              {summaryError && (
                <p className="mb-3 text-sm font-medium text-danger">
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
                <div className="mb-5">
                  <div className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-accent-hover">
                    TL;DR
                  </div>
                  <p className="font-serif text-[0.95rem] leading-[1.72] text-text-dim">
                    {transcript.summary}
                  </p>
                </div>
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
                            <span className="w-12 shrink-0 pt-2 text-right font-mono text-xs font-semibold tabular-nums text-accent">
                              {formatTime(item.start_sec)}
                            </span>
                            {/* 圆点 + 竖虚线 */}
                            <div className="flex w-3 shrink-0 flex-col items-center">
                              <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_0_2px_var(--accent-glow)]" />
                              {!isLast && (
                                <span className="mt-1 w-px flex-1 border-l border-dashed border-border-hover" />
                              )}
                            </div>
                            {/* 标题卡片 */}
                            <button
                              onClick={() => handleSeek(item.start_sec)}
                              className="group mb-2 flex-1 rounded-lg bg-bg px-4 py-2.5 text-left shadow-ring transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:shadow-[0_0_0_1px_var(--accent)] hover:-translate-y-px"
                            >
                              <span className="font-serif text-sm font-semibold text-text group-hover:text-accent transition-colors">
                                {item.title}
                              </span>
                              {item.points?.length > 0 && (
                                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[13px] leading-relaxed text-text-muted">
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

      {/* 转录文本 / 我的笔记 —— tab 切换，笔记可随时二次编辑 */}
      <div className="mt-4 flex items-center gap-1 border-b border-border">
        <button onClick={() => setActiveTab("transcript")} className={tabClass(activeTab === "transcript")}>
          文字稿
        </button>
        <button onClick={() => setActiveTab("notes")} className={tabClass(activeTab === "notes")}>
          <PenLine size={14} />
          我的笔记
        </button>
      </div>

      <div className="mt-3" style={{ height: "calc(100vh - 400px)" }}>
        {activeTab === "transcript" ? (
          <TranscriptPanel
            segments={transcript?.segments || []}
            wordCount={transcript?.word_count || 0}
            currentTime={currentTime}
            onSeek={handleSeek}
            speakerLabels={speakerLabels}
          />
        ) : (
          <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-ring shadow-soft">
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="边听边记笔记，随时补充…每行一条。AI 摘要会结合你的笔记和转写稿。"
              className="flex-1 w-full resize-none bg-transparent text-[15px] leading-[1.9] text-text outline-none placeholder:text-text-muted/60"
            />
            <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-3">
              {noteDraft !== (recording.note ?? "") && (
                <span className="text-xs text-text-muted">未保存</span>
              )}
              <button
                onClick={handleSaveNote}
                disabled={savingNote || noteDraft === (recording.note ?? "")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-ring transition-all duration-200 hover:bg-accent-hover disabled:opacity-40"
              >
                {savingNote ? "保存中…" : "保存笔记"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
