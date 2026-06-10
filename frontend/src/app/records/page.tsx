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

const SOURCE_FILTERS = [
  { key: "all", label: "全部" },
  { key: "realtime", label: "实时记录" },
  { key: "upload", label: "本地音频" },
  { key: "podcast", label: "播客" },
] as const;

const SOURCE_LABELS: Record<string, string> = {
  realtime: "实时记录",
  upload: "本地音频",
  podcast: "播客",
};

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
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  useEffect(() => {
    getRecordings(1, 100)
      .then((data) => setRecordings(data.items))
      .catch(() => setRecordings([]))
      .finally(() => setLoading(false));
  }, []);

  // 有转写中的记录时自动轮询刷新状态
  const hasProcessing = recordings.some((r) =>
    ["uploading", "transcribing"].includes(r.status)
  );
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(() => {
      getRecordings(1, 100)
        .then((data) => setRecordings(data.items))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [hasProcessing]);

  const filteredRecordings = useMemo(() => {
    let items = recordings;

    if (status === "processing") {
      items = items.filter((item) =>
        ["uploading", "transcribing"].includes(item.status)
      );
    } else if (status) {
      items = items.filter((item) => item.status === status);
    }

    if (sourceFilter !== "all") {
      items = items.filter((item) => item.source === sourceFilter);
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
  }, [query, recordings, status, sourceFilter]);

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
      setMessage(
        result.mode === "written"
          ? `已导出到 Obsidian：${result.relative_path}`
          : `已下载 Obsidian 文件：${result.filename}（拖进你的 vault 即可）`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "导出到 Obsidian 失败"
      );
    }
  };

  return (
    <div className="min-h-[calc(100vh-136px)] overflow-hidden rounded-xl border border-border bg-surface shadow-ring shadow-soft">
      <div className="flex items-center justify-between gap-6 border-b border-border px-5 py-6 md:px-8 md:py-7">
        <div>
          <h1 className="font-serif text-[26px] font-semibold tracking-[-0.01em] text-text">
            {statusLabel(status || "all")}
          </h1>
          {query && (
            <p className="mt-1.5 text-[14px] text-text-muted">搜索：{query}</p>
          )}
        </div>
      </div>

      {/* 来源类型筛选：实时记录 / 本地音频 / 播客 */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 md:px-8">
        {SOURCE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setSourceFilter(f.key)}
            className={
              "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors " +
              (sourceFilter === f.key
                ? "bg-accent text-white shadow-ring"
                : "bg-surface-2 text-text-muted hover:text-text")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {(message || error) && (
        <div
          className={`border-b px-5 py-3 text-[13px] md:px-8 ${
            error
              ? "border-[rgba(181,81,63,0.22)] bg-[rgba(181,81,63,0.07)] text-danger"
              : "border-[rgba(91,140,110,0.24)] bg-[rgba(91,140,110,0.08)] text-success"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 items-center border-b border-border bg-surface-2/60 px-5 py-3.5 text-[12px] font-medium uppercase tracking-[0.06em] text-text-muted md:grid-cols-[minmax(0,1fr)_220px_360px] md:px-6">
        <div>文件</div>
        <div className="hidden md:block">创建时间 ↓</div>
        <div className="hidden text-right md:block">操作</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-text-muted">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-5 flex h-[88px] w-[140px] items-center justify-center rounded-xl bg-surface-2 shadow-ring">
            <FileAudio size={34} className="text-accent/55" />
          </div>
          <div className="font-serif text-[19px] font-semibold text-text">
            {query ? "没有匹配的转写" : "还没有转写内容"}
          </div>
          <Link
            href="/upload"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-[16px] font-medium text-white shadow-ring transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:bg-accent-hover"
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
                className="group grid cursor-pointer grid-cols-1 items-center border-b border-border px-5 py-5 transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:z-10 hover:rounded-lg hover:border-transparent hover:bg-surface-2/70 hover:shadow-[inset_0_0_0_1px_rgba(201,100,66,0.18)] md:grid-cols-[minmax(0,1fr)_220px_360px] md:px-6"
              >
                <div className="flex min-w-0 items-center gap-5">
                  <div className="flex h-[64px] w-[96px] shrink-0 items-center justify-center rounded-xl bg-surface-2 shadow-ring transition-colors duration-300 group-hover:bg-accent-glow">
                    <FileAudio
                      size={28}
                      className="text-text-muted transition-colors duration-300 group-hover:text-accent"
                    />
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
                        className="w-full max-w-[420px] rounded-lg border border-accent bg-surface px-2.5 py-1.5 text-[16px] font-medium text-text shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {recording.is_favorite && (
                          <Star
                            size={15}
                            className="shrink-0 text-accent"
                            fill="currentColor"
                          />
                        )}
                        <span className="truncate font-serif text-[16px] font-semibold text-text transition-colors duration-300 group-hover:text-accent">
                          {recording.title}
                        </span>
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-text-muted">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-text-dim">
                        {SOURCE_LABELS[recording.source] ?? recording.source}
                      </span>
                      <span>{formatDuration(recording.duration)}</span>
                      {recording.status !== "done" && (
                        <span>· {statusLabel(recording.status)}</span>
                      )}
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
                  <div className="group/act relative">
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(recording)}
                      aria-label={recording.is_favorite ? "取消收藏" : "收藏"}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-dim transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-accent hover:bg-accent-glow hover:text-accent"
                    >
                      <Star
                        size={16}
                        className={recording.is_favorite ? "text-accent" : ""}
                        fill={recording.is_favorite ? "currentColor" : "none"}
                      />
                    </button>
                    <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-text px-2 py-1 text-[11px] font-medium text-bg opacity-0 shadow-soft transition-opacity duration-150 group-hover/act:opacity-100">
                      {recording.is_favorite ? "取消收藏" : "收藏"}
                    </span>
                  </div>
                  <div className="group/act relative">
                    <button
                      type="button"
                      onClick={() => handleExportObsidian(recording)}
                      disabled={recording.status !== "done"}
                      aria-label="导出到 Obsidian"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-dim transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-accent hover:bg-accent-glow hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text-dim"
                    >
                      <FileDown size={16} />
                    </button>
                    <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-text px-2 py-1 text-[11px] font-medium text-bg opacity-0 shadow-soft transition-opacity duration-150 group-hover/act:opacity-100">
                      {recording.status === "done" ? "导出 Obsidian" : "转写完成后可导出"}
                    </span>
                  </div>
                  <div className="group/act relative">
                    <button
                      type="button"
                      onClick={() => startRename(recording)}
                      aria-label="重命名"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-dim transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-accent hover:bg-accent-glow hover:text-accent"
                    >
                      <Pencil size={16} />
                    </button>
                    <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-text px-2 py-1 text-[11px] font-medium text-bg opacity-0 shadow-soft transition-opacity duration-150 group-hover/act:opacity-100">
                      重命名
                    </span>
                  </div>
                  <div className="group/act relative">
                    <button
                      type="button"
                      onClick={() => handleDelete(recording)}
                      aria-label="删除"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-danger transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-danger hover:bg-[rgba(181,81,63,0.08)]"
                    >
                      <Trash2 size={16} />
                    </button>
                    <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-text px-2 py-1 text-[11px] font-medium text-bg opacity-0 shadow-soft transition-opacity duration-150 group-hover/act:opacity-100">
                      删除
                    </span>
                  </div>
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
        <div className="flex min-h-[calc(100vh-136px)] items-center justify-center rounded-xl border border-border bg-surface text-text-muted shadow-ring shadow-soft">
          <Loader2 size={28} className="animate-spin" />
        </div>
      }
    >
      <RecordsContent />
    </Suspense>
  );
}
