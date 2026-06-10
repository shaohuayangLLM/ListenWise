"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  Pause,
  Play,
  Square,
  Loader2,
  Check,
  FileText,
  RotateCcw,
} from "lucide-react";
import { useRecorder } from "@/hooks/useRecorder";
import { uploadRecording } from "@/lib/api";

function defaultTitle(): string {
  const now = new Date();
  const mm = (now.getMonth() + 1).toString();
  const dd = now.getDate().toString();
  const hh = now.getHours().toString().padStart(2, "0");
  const mi = now.getMinutes().toString().padStart(2, "0");
  return `${mm}月${dd}日 会议 ${hh}:${mi}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RecordPage() {
  const router = useRouter();
  const rec = useRecorder();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 进入页面即开始录音：点「开始会议」直接进录音态，省掉先点「开始录音」那步
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    rec.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 录音文件就绪 → 生成试听 URL，随文件清空而回收
  useEffect(() => {
    if (!rec.file) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(rec.file);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [rec.file]);

  const startTranscribe = async () => {
    if (!rec.file) return;
    setUploading(true);
    setProgress(0);
    setUploadError(null);
    try {
      const { id } = await uploadRecording({
        file: rec.file,
        title: title.trim() || defaultTitle(),
        note: notes.trim() || undefined,
        source: "realtime",
        onProgress: setProgress,
      });
      router.push(`/recordings/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "上传失败，请重试";
      setUploadError(msg);
      setUploading(false);
    }
  };

  const isRecording = rec.state === "recording";
  const isPaused = rec.state === "paused";
  const isReady = rec.state === "stopped" && !!rec.file;

  // 录音中 / 录完未转录时，刷新或关页前弹原生确认（防录音与笔记丢失）
  useEffect(() => {
    const dirty = isRecording || isPaused || (isReady && !uploading);
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isRecording, isPaused, isReady, uploading]);

  if (uploading) {
    return (
      <div className="max-w-[720px] mx-auto py-8">
        <div className="mt-24 flex flex-col items-center text-center">
          <Loader2 size={34} className="mb-5 text-accent animate-spin" />
          <p className="font-serif text-xl font-semibold mb-1.5">
            {title.trim() || "会议录音"}
          </p>
          <p className="text-sm text-text-muted">正在上传并开始转写… {progress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto py-8">
      {/* 顶栏：返回（左） + 录音状态（右，克制不抢戏） */}
      <div className="flex items-center justify-between gap-4 mb-9">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft size={16} />
          返回
        </Link>

        <div className="flex items-center gap-2">
          {rec.state === "idle" && (
            <button
              type="button"
              onClick={rec.start}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[13.5px] font-medium text-white shadow-ring transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-accent-hover"
            >
              <Mic size={15} />
              开始录音
            </button>
          )}

          {(isRecording || isPaused) && (
            <>
              <span
                className={
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium border transition-colors " +
                  (isRecording
                    ? "bg-accent-glow border-[rgba(201,100,66,0.28)] text-accent"
                    : "bg-surface border-border text-text-muted")
                }
              >
                {isRecording ? (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative h-2 w-2 rounded-full bg-accent" />
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-text-muted" />
                )}
                {isRecording ? "录音中" : "已暂停"}
                <span className="tabular-nums">{formatTime(rec.duration)}</span>
              </span>

              {isRecording ? (
                <button
                  type="button"
                  onClick={rec.pause}
                  title="暂停"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-dim transition-colors hover:border-accent hover:text-accent"
                >
                  <Pause size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={rec.resume}
                  title="继续"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-dim transition-colors hover:border-accent hover:text-accent"
                >
                  <Play size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={rec.stop}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white shadow-ring transition-colors hover:bg-accent-hover"
              >
                <Square size={13} />
                完成
              </button>
            </>
          )}

          {isReady && (
            <span className="inline-flex items-center gap-2 rounded-full bg-success/12 px-3 py-1.5 text-[13px] font-medium text-success">
              <Check size={14} />
              录音完成 · {formatTime(rec.duration)}
            </span>
          )}
        </div>
      </div>

      {/* 会议名：大标题，像摊开一张纸的封面 */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="未命名会议"
        className="w-full bg-transparent border-none outline-none font-serif text-[2rem] leading-[1.3] font-semibold tracking-[-0.01em] placeholder:text-text-muted/45 mb-5"
      />

      <div className="h-px bg-border mb-6" />

      {/* 笔记白板：主体，专注、大留白 */}
      <textarea
        autoFocus
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={
          rec.state === "idle"
            ? "在这里记会议要点…\n\n点右上角「开始录音」后，录音在后台安静进行，你专注记关注的重点。\n会后 AI 摘要会把你的笔记和转写稿结合。"
            : "记会议要点，每行一条…"
        }
        className="w-full min-h-[44vh] bg-transparent border-none outline-none resize-none text-[17px] leading-[1.95] text-text placeholder:text-text-muted/55"
      />

      {rec.error && (
        <p className="text-sm text-danger font-medium mb-4">{rec.error}</p>
      )}

      {/* 就绪态：试听 + 手动转录 + 重新录制 */}
      {isReady && (
        <div className="mt-2 rounded-xl border border-border bg-surface p-5 shadow-ring shadow-soft">
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full mb-5" />
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={startTranscribe}
              className="flex flex-1 items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-medium text-sm shadow-ring transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-accent-hover hover:-translate-y-0.5"
            >
              <FileText size={17} />
              开始转录
            </button>
            <button
              type="button"
              onClick={rec.reset}
              className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border bg-surface text-sm font-medium transition-all duration-200 hover:border-accent hover:bg-accent-glow hover:text-accent"
            >
              <RotateCcw size={16} />
              重新录制
            </button>
          </div>
          {uploadError && (
            <p className="text-sm text-danger font-medium mt-3 text-center">
              {uploadError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
