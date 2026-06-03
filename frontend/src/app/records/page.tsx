"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileAudio,
  Loader2,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import {
  deleteRecording,
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

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
    setOpenMenuId(null);
    const next = !rec.is_favorite;
    patchLocal(rec.id, { is_favorite: next });
    try {
      await updateRecording(rec.id, { is_favorite: next });
    } catch {
      patchLocal(rec.id, { is_favorite: rec.is_favorite }); // 回滚
    }
  };

  const startRename = (rec: Recording) => {
    setOpenMenuId(null);
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
    setOpenMenuId(null);
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
          {filteredRecordings.map((recording) => {
            const isEditing = editingId === recording.id;
            return (
              <div
                key={recording.id}
                onClick={() =>
                  !isEditing && router.push(`/recordings/${recording.id}`)
                }
                className="grid grid-cols-[1fr_64px] items-center border-b border-border px-5 py-5 hover:bg-surface transition-colors cursor-pointer md:grid-cols-[1fr_260px_80px] md:px-6"
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
                  className="relative flex justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId(
                        openMenuId === recording.id ? null : recording.id
                      )
                    }
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-text-dim hover:bg-surface-2 hover:text-text transition-colors"
                    aria-label="更多操作"
                  >
                    <MoreHorizontal size={25} />
                  </button>

                  {openMenuId === recording.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 top-11 z-20 w-36 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg">
                        <button
                          onClick={() => handleToggleFavorite(recording)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[14px] text-text hover:bg-surface"
                        >
                          <Star
                            size={15}
                            className={
                              recording.is_favorite
                                ? "text-warning"
                                : "text-text-dim"
                            }
                            fill={
                              recording.is_favorite ? "currentColor" : "none"
                            }
                          />
                          {recording.is_favorite ? "取消收藏" : "收藏"}
                        </button>
                        <button
                          onClick={() => startRename(recording)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[14px] text-text hover:bg-surface"
                        >
                          <Pencil size={15} className="text-text-dim" />
                          重命名
                        </button>
                        <button
                          onClick={() => handleDelete(recording)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[14px] text-danger hover:bg-surface"
                        >
                          <Trash2 size={15} />
                          删除
                        </button>
                      </div>
                    </>
                  )}
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
