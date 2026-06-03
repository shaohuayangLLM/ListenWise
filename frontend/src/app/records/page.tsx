"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileAudio, Loader2, MoreHorizontal, Upload } from "lucide-react";
import { getRecordings, type Recording } from "@/lib/api";

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "处理中";
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${minutes} 分 ${remain} 秒`;
}

function formatCreatedAt(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    all: "我的记录",
    processing: "转写中",
    uploading: "上传中",
    transcribing: "转写中",
    done: "已完成",
    failed: "失败",
  };
  return labels[status] || status;
}

function RecordsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecordings(1, 100)
      .then((data) => setRecordings(data.items))
      .catch(() => setRecordings([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredRecordings = useMemo(() => {
    let items = recordings;

    if (status === "processing") {
      items = items.filter((item) =>
        ["uploading", "transcribing"].includes(item.status)
      );
    } else if (status) {
      items = items.filter((item) => item.status === status);
    }

    if (!query) return items;
    const lowered = query.toLowerCase();
    return items.filter((item) =>
      item.title.toLowerCase().includes(lowered)
    );
  }, [query, recordings, status]);

  return (
    <div className="min-h-[calc(100vh-136px)] rounded-lg border border-border bg-white">
      <div className="flex items-center justify-between gap-6 border-b border-border px-5 py-5 md:px-8 md:py-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-normal">
            {statusLabel(status || "all")}
          </h1>
          {query && (
            <p className="mt-1 text-[14px] text-text-dim">
              搜索：{query}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_64px] items-center border-b border-border px-5 py-4 text-[14px] font-semibold text-text-dim md:grid-cols-[1fr_260px_80px] md:px-6">
        <div>文件</div>
        <div className="hidden md:block">创建时间 ↓</div>
        <div className="text-right">操作</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-text-dim">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-[140px] h-[88px] rounded-lg bg-[#dfe8fb] flex items-center justify-center mb-5">
            <FileAudio size={34} className="text-white" />
          </div>
          <div className="text-[18px] font-medium text-text">
            {query ? "没有匹配的转写" : "还没有转写内容"}
          </div>
          <Link
            href="/upload"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[16px] font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Upload size={18} />
            上传音频
          </Link>
        </div>
      ) : (
        <div>
          {filteredRecordings.map((recording) => (
            <div
              key={recording.id}
              className="grid grid-cols-[1fr_64px] items-center border-b border-border px-5 py-5 hover:bg-surface transition-colors md:grid-cols-[1fr_260px_80px] md:px-6"
            >
              <Link
                href={`/recordings/${recording.id}`}
                className="flex items-center gap-5 min-w-0"
              >
                <div className="w-[96px] h-[64px] rounded-lg bg-[#dfe8fb] flex items-center justify-center shrink-0">
                  <FileAudio size={28} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-medium text-text">
                    {recording.title}
                  </div>
                  <div className="mt-1.5 text-[13px] text-text-dim">
                    {formatDuration(recording.duration)}
                    {recording.status !== "done" &&
                      ` · ${statusLabel(recording.status)}`}
                  </div>
                </div>
              </Link>

              <div className="hidden text-[14px] text-text-dim md:block">
                {formatCreatedAt(recording.created_at)}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-text-dim hover:bg-surface-2 hover:text-text transition-colors"
                  aria-label="更多操作"
                >
                  <MoreHorizontal size={25} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecordsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-136px)] items-center justify-center rounded-lg border border-border bg-white text-text-dim">
          <Loader2 size={28} className="animate-spin" />
        </div>
      }
    >
      <RecordsContent />
    </Suspense>
  );
}
