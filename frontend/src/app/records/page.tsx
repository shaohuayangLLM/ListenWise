"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileAudio,
  FileDown,
  Loader2,
  Pencil,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import {
  deleteRecording,
  exportRecordingToObsidian,
  getRecordings,
  updateRecording,
  type Recording,
} from "@/lib/api";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    if (query) {
      const lowered = query.toLowerCase();
      items = items.filter((item) =>
        item.title.toLowerCase().includes(lowered)
      );
    }

    // 收藏置顶，其余保持后端的时间倒序
    return [...items].sort(
      (a, b) => Number(b.is_favorite) - Number(a.is_favorite)
    );
  }, [query, recordings, status]);

  const patchLocal = (id: number, patch: Partial<Recording>) =>
    setRecordings((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleToggleFavorite = async (rec: Recording) => {
    const next = !rec.is_favorite;
    patchLocal(rec.id, { is_favorite: next });
    try {
      await updateRecording(rec.id, { is_favorite: next });
    } catch {
      patchLocal(rec.id, { is_favorite: rec.is_favorite }); // 回滚
    }
  };

  const startRename = (rec: Recording) => {
    setEditingId(rec.id);
    setEditValue(rec.title);
  };

  const saveRename = async (id: number) => {
    const value = editValue.trim();
    setEditingId(null);
    if (!value || value === recordings.find((r) => r.id === id)?.title) return;
    patchLocal(id, { title: value });
    try {
      await updateRecording(id, { title: value });
    } catch {
      // 失败则重新拉取以恢复
      getRecordings(1, 100).then((d) => setRecordings(d.items));
    }
  };

  const handleDelete = async (rec: Recording) => {
    if (
      !window.confirm(`确定删除「${rec.title}」？转写记录与音频将一并移除，无法恢复。`)
    )
      return;
    const snapshot = recordings;
    setRecordings((rs) => rs.filter((r) => r.id !== rec.id));
    try {
      await deleteRecording(rec.id);
    } catch {
      setRecordings(snapshot); // 回滚
      window.alert("删除失败，请重试");
    }
  };

  const handleExportObsidian = async (rec: Recording) => {
    setMessage(null);
    setError(null);
    try {
      const result = await exportRecordingToObsidian(rec.id);
      setMessage(`已导出到 Obsidian：${result.relative_path}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "导出到 Obsidian 失败"
      );
    }
  };

  return (
    <div className="min-h-[calc(100vh-136px)] rounded-lg border border-border bg-white">
      <div className="flex items-center justify-between gap-6 border-b border-border px-5 py-5 md:px-8 md:py-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-normal">
            {statusLabel(status || "all")}
          </h1>
          {query && (
            <p className="mt-1 text-[14px] text-text-dim">搜索：{query}</p>
          )}
        </div>
      </div>

      {(message || error) && (
        <div
          className={`border-b px-5 py-3 text-[13px] md:px-8 ${
            error
              ? "border-[#FFD6D9] bg-[#FFF4F5] text-[#C83B48]"
              : "border-[#CFE7D8] bg-[#F1FBF5] text-[#167A45]"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 items-center border-b border-border px-5 py-4 text-[14px] font-semibold text-text-dim md:grid-cols-[minmax(0,1fr)_220px_360px] md:px-6">
        <div>文件</div>
        <div className="hidden md:block">创建时间 ↓</div>
        <div className="hidden text-right md:block">操作</div>
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
          {filteredRecordings.map((recording) => {
            const isEditing = editingId === recording.id;
            return (
              <div
                key={recording.id}
                onClick={() =>
                  !isEditing && router.push(`/recordings/${recording.id}`)
                }
                className="grid grid-cols-1 items-center border-b border-border px-5 py-5 hover:bg-surface transition-colors cursor-pointer md:grid-cols-[minmax(0,1fr)_220px_360px] md:px-6"
              >
                <div className="flex items-center gap-5 min-w-0">
                  <div className="w-[96px] h-[64px] rounded-lg bg-[#dfe8fb] flex items-center justify-center shrink-0">
                    <FileAudio size={28} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    {isEditing ? (
                      <input
                        value={editValue}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveRename(recording.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(recording.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full max-w-[420px] rounded-md border border-accent bg-white px-2.5 py-1.5 text-[16px] font-medium text-text focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {recording.is_favorite && (
                          <Star
                            size={15}
                            className="shrink-0 text-warning"
                            fill="currentColor"
                          />
                        )}
                        <span className="truncate text-[16px] font-medium text-text">
                          {recording.title}
                        </span>
                      </div>
                    )}
                    <div className="mt-1.5 text-[13px] text-text-dim">
                      {formatDuration(recording.duration)}
                      {recording.status !== "done" &&
                        ` · ${statusLabel(recording.status)}`}
                    </div>
                  </div>
                </div>

                <div className="hidden text-[14px] text-text-dim md:block">
                  {formatCreatedAt(recording.created_at)}
                </div>

                <div
                  className="mt-4 flex flex-wrap justify-start gap-2 md:mt-0 md:justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(recording)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-text-dim transition-colors hover:border-accent hover:text-accent"
                  >
                    <Star
                      size={15}
                      className={recording.is_favorite ? "text-warning" : ""}
                      fill={recording.is_favorite ? "currentColor" : "none"}
                    />
                    {recording.is_favorite ? "取消收藏" : "收藏"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportObsidian(recording)}
                    disabled={recording.status !== "done"}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-text-dim transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-dim"
                    title={
                      recording.status === "done"
                        ? "导出到 Obsidian"
                        : "转写完成后可导出"
                    }
                  >
                    <FileDown size={15} />
                    导出 Obsidian
                  </button>
                  <button
                    type="button"
                    onClick={() => startRename(recording)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-text-dim transition-colors hover:border-accent hover:text-accent"
                  >
                    <Pencil size={15} />
                    重命名
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(recording)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-danger transition-colors hover:border-danger hover:bg-[#FFF4F5]"
                  >
                    <Trash2 size={15} />
                    删除
                  </button>
                </div>
              </div>
            );
          })}
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
