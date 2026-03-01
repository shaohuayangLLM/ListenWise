"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Upload,
  Search,
  Calendar,
  FolderOpen,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import TimelineView from "@/components/TimelineView";
import FolderView from "@/components/FolderView";
import { getRecordings, type Recording } from "@/lib/api";

const FILTER_OPTIONS = [
  { value: "", label: "全部" },
  { value: "requirement_review,report_meeting,leadership_conference", label: "工作会议" },
  { value: "study_recording", label: "学习笔记" },
  { value: "parent_meeting", label: "生活记录" },
  { value: "phone_call", label: "电话通话" },
];

export default function LibraryPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"timeline" | "folder">("timeline");

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecordings(1, 100);
      setRecordings(data.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  // Client-side filtering
  const filteredRecordings = recordings.filter((rec) => {
    // Scene filter
    if (activeFilter) {
      const allowedScenes = activeFilter.split(",");
      if (!allowedScenes.includes(rec.scene_type)) return false;
    }
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!rec.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold">录音库</h1>
        <div className="flex items-center gap-3">
          {/* View Switcher */}
          <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView("timeline")}
              className={clsx(
                "flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium transition-colors",
                view === "timeline"
                  ? "bg-accent-glow text-accent"
                  : "text-text-dim hover:bg-surface-2"
              )}
            >
              <Calendar size={14} />
              时间线
            </button>
            <button
              onClick={() => setView("folder")}
              className={clsx(
                "flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium transition-colors",
                view === "folder"
                  ? "bg-accent-glow text-accent"
                  : "text-text-dim hover:bg-surface-2"
              )}
            >
              <FolderOpen size={14} />
              文件夹
            </button>
          </div>

          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 bg-accent text-white px-4 py-2 rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            <Upload size={14} />
            上传
          </Link>
        </div>
      </div>

      {/* Toolbar: Search + Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-[400px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="搜索录音名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="flex gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={clsx(
                "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors",
                activeFilter === opt.value
                  ? "border-accent text-accent bg-accent-glow"
                  : "border-border text-text-dim bg-surface hover:border-border-hover"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {view === "timeline" ? (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-accent" />
          </div>
        ) : (
          <TimelineView recordings={filteredRecordings} hasFilter={!!searchQuery || !!activeFilter} />
        )
      ) : (
        <FolderView totalCount={recordings.length} />
      )}
    </div>
  );
}
