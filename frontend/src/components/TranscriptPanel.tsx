"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import type { TranscriptSegment } from "@/lib/api";

const SPEAKER_COLORS: Record<string, string> = {
  A: "var(--accent)",
  B: "var(--text-muted)",
  C: "var(--accent-2)",
  D: "var(--accent-hover)",
};

function getSpeakerColor(speaker: string): string {
  // Try direct map first, then use the first letter
  if (SPEAKER_COLORS[speaker]) return SPEAKER_COLORS[speaker];
  const key = speaker.charAt(0).toUpperCase();
  return SPEAKER_COLORS[key] || "var(--text-dim)";
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  wordCount: number;
  currentTime: number;
  onSeek: (time: number) => void;
  speakerLabels?: Record<string, string>;
}

export default function TranscriptPanel({
  segments,
  wordCount,
  currentTime,
  onSeek,
  speakerLabels = {},
}: TranscriptPanelProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentTime]);

  if (segments.length === 0) {
    return (
      <div className="bg-surface rounded-xl shadow-ring shadow-soft overflow-hidden h-full flex flex-col">
        <div className="px-6 py-5 border-b border-surface-2 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold tracking-tight">转录文本</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm p-8">
          暂无转录数据，等待处理完成
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl shadow-ring shadow-soft overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-surface-2 flex items-baseline gap-2.5 shrink-0">
        <h2 className="font-serif text-lg font-semibold tracking-tight">转录文本</h2>
        <span className="text-xs text-text-muted font-mono tabular-nums px-2 py-0.5 rounded bg-bg shadow-ring">
          共 {wordCount.toLocaleString()} 字
        </span>
      </div>

      {/* Segments */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0.5">
        {segments.map((seg, i) => {
          const isActive = currentTime >= seg.start && currentTime < seg.end;
          return (
            <div
              key={i}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSeek(seg.start)}
              className={clsx(
                "flex gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] text-sm",
                isActive
                  ? "bg-surface shadow-[0_0_0_1px_var(--accent)]"
                  : "hover:bg-bg"
              )}
            >
              <span
                className={clsx(
                  "text-xs font-mono tabular-nums w-12 shrink-0 pt-1 transition-colors",
                  isActive ? "text-accent font-semibold" : "text-text-muted"
                )}
              >
                {formatTimestamp(seg.start)}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className="text-[0.84rem] font-semibold mb-1 flex items-center gap-2"
                  style={{ color: getSpeakerColor(seg.speaker) }}
                >
                  {speakerLabels[seg.speaker] || seg.speaker}
                  {isActive && (
                    <span className="inline-flex items-center gap-1.5 text-[0.62rem] font-mono uppercase tracking-wider text-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                      正在播放
                    </span>
                  )}
                </div>
                <p className="font-serif text-[0.97rem] leading-[1.74] text-text">
                  {seg.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
