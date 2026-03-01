"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, FolderOpen } from "lucide-react";
import FolderSidebar from "@/components/FolderSidebar";
import EmptyState from "@/components/EmptyState";
import { getRecordingsByFolder, type Recording } from "@/lib/api";

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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (days === 0) return `今天 ${time}`;
  if (days === 1) return `昨天 ${time}`;
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}小时${m}分`;
  return `${m}分钟`;
}

interface FolderViewProps {
  totalCount: number;
}

export default function FolderView({ totalCount }: FolderViewProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecordingsByFolder(selectedFolderId);
      setRecordings(data.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  return (
    <div className="grid grid-cols-[220px_1fr] gap-6">
      {/* Sidebar */}
      <FolderSidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        totalCount={totalCount}
      />

      {/* Recording list */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        ) : recordings.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="此文件夹暂无录音"
            description="将录音移动到此文件夹，或上传新的录音"
          />
        ) : (
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
                      {rec.status !== "done" && ` \u00B7 ${rec.status === "failed" ? "失败" : "处理中"}`}
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
        )}
      </div>
    </div>
  );
}
