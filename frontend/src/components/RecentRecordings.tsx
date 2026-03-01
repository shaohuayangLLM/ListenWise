"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mic } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { getRecordings, type Recording } from "@/lib/api";

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

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}小时${m}分`;
  return `${m}分钟`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (days === 1) {
    return `昨天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

export default function RecentRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecordings(1, 5)
      .then((data) => setRecordings(data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between text-base font-semibold mb-4">
          最近录音
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-lg p-4 mb-2 h-16 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between text-base font-semibold mb-4">
          最近录音
        </div>
        <div className="bg-surface border border-border rounded-xl">
          <EmptyState
            icon={Mic}
            title="还没有录音"
            description="上传第一个录音，开始体验智能转录"
            actionLabel="上传录音"
            actionHref="/upload"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between text-base font-semibold mb-4">
        最近录音
        <Link
          href="/library"
          className="text-sm font-medium text-accent hover:opacity-80"
        >
          查看全部
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {recordings.map((rec) => {
          const colors = SCENE_COLORS[rec.scene_type] || SCENE_COLORS.requirement_review;
          return (
            <Link
              key={rec.id}
              href={`/recordings/${rec.id}`}
              className="bg-surface border border-border rounded-lg px-4 py-3.5 flex items-center gap-3.5 hover:border-border-hover hover:bg-surface-2 transition-all"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: colors.dot }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{rec.title}</p>
                <p className="text-[11px] text-text-dim mt-0.5">
                  {formatDate(rec.created_at)}
                  {rec.duration > 0 && ` \u00B7 ${formatDuration(rec.duration)}`}
                  {rec.speaker_count > 0 && ` \u00B7 ${rec.speaker_count} 位发言人`}
                </p>
              </div>
              <span
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-xl whitespace-nowrap"
                style={{ background: colors.bg, color: colors.text }}
              >
                {SCENE_LABELS[rec.scene_type] || rec.scene_type}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
