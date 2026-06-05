"use client";

import { use, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckSquare,
  Loader2,
  RefreshCw,
  Rss,
  Trash2,
  X,
} from "lucide-react";
import {
  batchTranscribePodcastEpisodes,
  deletePodcastShow,
  getPodcastEpisodes,
  getPodcastShow,
  loadMorePodcastEpisodes,
  refreshPodcastShow,
  unsubscribePodcastShow,
  type PodcastEpisode,
  type PodcastShow,
} from "@/lib/api";

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "日期未知";
}

function statusLabel(status: string) {
  return {
    not_requested: "未获取文字稿",
    transcribing: "转写中",
    uploading: "转写中",
    done: "已完成",
    failed: "失败",
  }[status] || status;
}

export default function PodcastShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const showId = Number(id);
  const router = useRouter();
  const [show, setShow] = useState<PodcastShow | null>(null);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [showData, episodeData] = await Promise.all([
      getPodcastShow(showId),
      getPodcastEpisodes(showId),
    ]);
    setShow(showData);
    setEpisodes(episodeData);
  }, [showId]);

  useEffect(() => {
    reload()
      .catch(() => setError("无法加载节目"))
      .finally(() => setLoading(false));
  }, [reload]);

  const run = async (action: "refresh" | "more") => {
    setWorking(action);
    setMessage(null);
    setError(null);
    try {
      const result =
        action === "refresh"
          ? await refreshPodcastShow(showId)
          : await loadMorePodcastEpisodes(showId);
      setMessage(
        `${action === "refresh" ? "刷新完成" : "加载完成"}：新增 ${result.added} 集`
      );
      await reload();
    } catch {
      setError(action === "refresh" ? "刷新失败" : "无法加载更多单集");
    } finally {
      setWorking(null);
    }
  };

  const unsubscribe = async () => {
    if (!window.confirm("取消订阅后将停止获取新单集，已有内容和文字稿会保留。")) return;
    await unsubscribePodcastShow(showId);
    await reload();
  };

  const deleteShow = async () => {
    if (
      !window.confirm(
        "确定删除节目目录和已同步单集？已获取的文字稿仍会保留在“我的记录”中。"
      )
    )
      return;
    await deletePodcastShow(showId);
    router.push("/podcast");
  };

  const eligibleEpisodes = episodes.filter(
    (episode) =>
      episode.audio_url_available &&
      ["not_requested", "failed"].includes(episode.recording_status)
  );

  const toggleSelection = (episodeId: number) => {
    if (!selectedIds.has(episodeId) && selectedIds.size >= 10) {
      setError("单次最多选择 10 集");
      return;
    }
    setError(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(episodeId)) {
        next.delete(episodeId);
      } else {
        next.add(episodeId);
      }
      return next;
    });
  };

  const selectEligible = () => {
    setSelectedIds(
      new Set(eligibleEpisodes.slice(0, 10).map((episode) => episode.id))
    );
    if (eligibleEpisodes.length > 10) {
      setMessage("已选择前 10 集，单次最多批量获取 10 集文字稿");
    }
  };

  const resetSelection = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const cancelSelection = () => {
    resetSelection();
    setMessage(null);
    setError(null);
  };

  const batchTranscribe = async () => {
    const ids = Array.from(selectedIds);
    if (
      ids.length === 0 ||
      !window.confirm(`确定为选中的 ${ids.length} 集获取文字稿？这将调用 ASR。`)
    )
      return;
    setWorking("batch");
    setMessage(null);
    setError(null);
    try {
      const result = await batchTranscribePodcastEpisodes(ids);
      setMessage(
        `已开始获取 ${result.started} 集文字稿${
          result.skipped.length ? `，跳过 ${result.skipped.length} 集` : ""
        }`
      );
      resetSelection();
      await reload();
    } catch {
      setError("批量获取文字稿失败");
    } finally {
      setWorking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );
  }
  if (!show) {
    return <div className="py-20 text-center text-text-dim">节目不存在</div>;
  }

  return (
    <div className="mx-auto max-w-[1040px] space-y-6">
      <Link
        href="/podcast"
        className="inline-flex items-center gap-2 text-[13px] text-text-dim hover:text-accent"
      >
        <ArrowLeft size={16} />
        返回播客
      </Link>

      <section className="rounded-lg border border-border bg-white p-6">
        <div className="flex flex-wrap items-start gap-5">
          {show.cover_url ? (
            <Image
              src={show.cover_url}
              alt=""
              width={112}
              height={112}
              unoptimized
              className="h-28 w-28 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg bg-accent-glow text-accent">
              <Rss size={32} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-[24px] font-bold text-text">{show.title}</h1>
                <p className="mt-1 text-[13px] text-text-dim">
                  {show.author || "作者未知"} · {show.episode_count} 集 ·{" "}
                  {show.transcript_count} 篇文字稿
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => run("refresh")}
                  disabled={working !== null}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white disabled:opacity-50"
                >
                  <RefreshCw
                    size={15}
                    className={working === "refresh" ? "animate-spin" : ""}
                  />
                  刷新此节目
                </button>
                {show.is_subscribed && (
                  <button
                    onClick={unsubscribe}
                    className="h-9 rounded-lg border border-border px-3.5 text-[13px] text-text-dim hover:text-text"
                  >
                    取消订阅
                  </button>
                )}
                <button
                  onClick={deleteShow}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-dim hover:border-[#FFB7BD] hover:text-[#C83B48]"
                  aria-label="删除节目"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            {show.description && (
              <p className="mt-4 line-clamp-4 whitespace-pre-line text-[13px] leading-6 text-text-dim">
                {show.description}
              </p>
            )}
            {show.last_sync_message && (
              <p className="mt-3 text-[12px] text-warning">
                {show.last_sync_message}
              </p>
            )}
          </div>
        </div>
      </section>

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-[13px] ${
            error
              ? "border-[#FFD6D9] bg-[#FFF4F5] text-[#C83B48]"
              : "border-[#CFE7D8] bg-[#F1FBF5] text-[#167A45]"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-[16px] font-semibold">单集</h2>
          {selecting ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-text-dim">
                已选择 {selectedIds.size}/10 集
              </span>
              <button
                onClick={selectEligible}
                disabled={eligibleEpisodes.length === 0 || working !== null}
                className="h-9 rounded-lg border border-border px-3 text-[13px] text-text-dim hover:border-accent hover:text-accent disabled:opacity-40"
              >
                全选可获取
              </button>
              <button
                onClick={() => cancelSelection()}
                disabled={working !== null}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-dim hover:text-text disabled:opacity-40"
                aria-label="取消批量选择"
              >
                <X size={15} />
              </button>
              <button
                onClick={batchTranscribe}
                disabled={selectedIds.size === 0 || working !== null}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-[13px] font-medium text-white disabled:opacity-40"
              >
                {working === "batch" && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                获取文字稿
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSelecting(true)}
              disabled={eligibleEpisodes.length === 0 || working !== null}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3.5 text-[13px] text-text-dim hover:border-accent hover:text-accent disabled:opacity-40"
            >
              <CheckSquare size={15} />
              批量获取文字稿
            </button>
          )}
        </div>
        {episodes.length === 0 ? (
          <div className="py-20 text-center text-[14px] text-text-muted">
            还没有同步到单集
          </div>
        ) : (
          episodes.map((episode) => {
            const eligible =
              episode.audio_url_available &&
              ["not_requested", "failed"].includes(episode.recording_status);
            const content = (
              <>
                <div className="truncate text-[14px] font-medium text-text">
                  {episode.title}
                </div>
                <div className="text-[12px] text-text-dim">
                  {formatDate(episode.published_at)}
                </div>
                <div className="text-[12px] font-medium text-accent">
                  {statusLabel(episode.recording_status)}
                </div>
              </>
            );

            return selecting ? (
              <label
                key={episode.id}
                className={`grid gap-2 border-b border-border px-5 py-4 last:border-0 md:grid-cols-[28px_1fr_150px_130px] ${
                  eligible ? "cursor-pointer hover:bg-surface" : "opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(episode.id)}
                  disabled={!eligible || working !== null}
                  onChange={() => toggleSelection(episode.id)}
                  className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                />
                {content}
              </label>
            ) : (
              <Link
                key={episode.id}
                href={`/podcast/episodes/${episode.id}`}
                className="grid gap-2 border-b border-border px-5 py-4 last:border-0 hover:bg-surface md:grid-cols-[1fr_150px_130px]"
              >
                {content}
              </Link>
            );
          })
        )}
        <div className="border-t border-border p-4 text-center">
          <button
            onClick={() => run("more")}
            disabled={working !== null || show.source_limited}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-4 text-[13px] text-text-dim hover:border-accent hover:text-accent disabled:opacity-40"
          >
            {working === "more" && <Loader2 size={14} className="animate-spin" />}
            加载更多
          </button>
        </div>
      </section>
    </div>
  );
}
