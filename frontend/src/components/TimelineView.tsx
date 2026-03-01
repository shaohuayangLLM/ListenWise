"use client";

import Link from "next/link";
import { Mic } from "lucide-react";
import EmptyState, { SearchEmpty } from "@/components/EmptyState";
import type { Recording } from "@/lib/api";

const SCENE_LABELS: Record<string, string> = {
  requirement_review: "需求评审",
  report_meeting: "汇报会议",
  leadership_conference: "领导大会",
  parent_meeting: "家长会",
  phone_call: "电话录音",
  study_recording: "学习录音",
};

const SCENE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  requirement_review: { bg: "rgba(108,92,231,0.1)", text: "#5a4bd1", dot: "var(--accent)" },
  report_meeting: { bg: "rgba(108,92,231,0.1)", text: "#5a4bd1", dot: "var(--accent)" },
  leadership_conference: { bg: "rgba(108,92,231,0.1)", text: "#5a4bd1", dot: "var(--accent)" },
  parent_meeting: { bg: "rgba(232,67,147,0.1)", text: "#d63384", dot: "var(--accent-3)" },
  phone_call: { bg: "rgba(225,125,16,0.1)", text: "#c96a0a", dot: "var(--warning)" },
  study_recording: { bg: "rgba(0,168,163,0.1)", text: "#008f8a", dot: "var(--accent-2)" },
};

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  uploading: { text: "上传中", className: "text-accent" },
  transcribing: { text: "处理中", className: "text-accent" },
  analyzing: { text: "处理中", className: "text-accent" },
  done: { text: "已完成", className: "text-success" },
  failed: { text: "失败", className: "text-[var(--accent-3)]" },
};

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatGroupDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`;

  if (diffDays === 0) return `今天 \u00B7 ${monthDay}`;
  if (diffDays === 1) return `昨天 \u00B7 ${monthDay}`;
  return `${monthDay} \u00B7 ${weekdays[date.getDay()]}`;
}

function formatItemTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDate(recordings: Recording[]): Map<string, Recording[]> {
  const groups = new Map<string, Recording[]>();
  for (const rec of recordings) {
    const date = new Date(rec.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const existing = groups.get(key) || [];
    existing.push(rec);
    groups.set(key, existing);
  }
  return groups;
}

interface TimelineViewProps {
  recordings: Recording[];
  hasFilter?: boolean;
}

export default function TimelineView({ recordings, hasFilter }: TimelineViewProps) {
  if (recordings.length === 0) {
    if (hasFilter) {
      return <SearchEmpty />;
    }
    return (
      <EmptyState
        icon={Mic}
        title="录音库为空"
        description="上传你的第一个录音，开始体验智能转录"
        actionLabel="去上传录音"
        actionHref="/upload"
      />
    );
  }

  const groups = groupByDate(recordings);

  return (
    <div className="relative">
      {Array.from(groups.entries()).map(([dateKey, items]) => (
        <div key={dateKey} className="mb-8">
          {/* Date header with timeline dot */}
          <div className="relative text-[13px] font-semibold text-text-dim mb-3 pl-5">
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent-glow border-2 border-accent"
            />
            {formatGroupDate(items[0].created_at)}
          </div>

          {/* Timeline items */}
          <div className="flex flex-col gap-2 pl-5 border-l-2 border-border ml-[4px]">
            {items.map((rec) => {
              const colors = SCENE_COLORS[rec.scene_type] || SCENE_COLORS.requirement_review;
              const status = STATUS_LABELS[rec.status] || STATUS_LABELS.done;

              return (
                <Link
                  key={rec.id}
                  href={`/recordings/${rec.id}`}
                  className="bg-surface border border-border rounded-lg px-5 py-3.5 flex items-center gap-4 hover:border-border-hover hover:bg-surface-2 transition-all ml-3"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: colors.dot }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1 truncate">{rec.title}</p>
                    <p className="text-xs text-text-dim">
                      {formatItemTime(rec.created_at)}
                      {" \u00B7 "}
                      {SCENE_LABELS[rec.scene_type] || rec.scene_type}
                      {rec.speaker_count > 0 && ` \u00B7 ${rec.speaker_count} 位发言人`}
                    </p>
                  </div>

                  <span
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-xl whitespace-nowrap shrink-0"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {SCENE_LABELS[rec.scene_type] || rec.scene_type}
                  </span>

                  <span className="text-xs font-mono text-text-muted whitespace-nowrap shrink-0">
                    {formatDuration(rec.duration)}
                  </span>

                  <span className={`text-[11px] font-medium whitespace-nowrap shrink-0 ${status.className}`}>
                    {rec.status === "done" && "\u2713 "}
                    {status.text}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
