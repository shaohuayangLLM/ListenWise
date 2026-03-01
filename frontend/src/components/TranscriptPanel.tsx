"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import type { TranscriptSegment } from "@/lib/api";

const SPEAKER_COLORS: Record<string, string> = {
  A: "var(--accent)",
  B: "var(--accent-2)",
  C: "var(--accent-3)",
  D: "var(--warning)",
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
}

export default function TranscriptPanel({
  segments,
  wordCount,
  currentTime,
  onSeek,
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
      <div className="bg-surface border border-border rounded-xl overflow-hidden h-full flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">转录文本</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm p-8">
          暂无转录数据，等待处理完成
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-base font-semibold">转录文本</h2>
        <span className="text-xs text-text-muted">
          共 {wordCount.toLocaleString()} 字
        </span>
      </div>

      {/* Segments */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {segments.map((seg, i) => {
          const isActive = currentTime >= seg.start && currentTime < seg.end;
          return (
            <div
              key={i}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSeek(seg.start)}
              className={clsx(
                "flex gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm",
                isActive
                  ? "bg-accent-glow border border-[rgba(108,92,231,0.2)]"
                  : "hover:bg-surface-2"
              )}
            >
              <span className="text-xs text-text-muted font-mono w-10 shrink-0 pt-0.5">
                {formatTimestamp(seg.start)}
              </span>
              <span
                className="text-xs font-medium w-16 shrink-0 pt-0.5"
                style={{ color: getSpeakerColor(seg.speaker) }}
              >
                {seg.speaker}
              </span>
              <span className="flex-1 leading-relaxed">{seg.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
