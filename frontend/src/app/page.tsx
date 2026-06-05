"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileAudio, Loader2 } from "lucide-react";
import { getRecordings, type Recording } from "@/lib/api";

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_TAG: Record<string, { label: string; className: string }> = {
  done: { label: "已完成", className: "bg-[rgba(91,140,110,0.12)] text-success" },
  transcribing: { label: "转写中", className: "bg-[rgba(201,138,66,0.12)] text-warning" },
  uploading: { label: "上传中", className: "bg-[rgba(201,138,66,0.12)] text-warning" },
  failed: { label: "失败", className: "bg-[rgba(181,81,63,0.12)] text-danger" },
};

/** 声纹波形装饰 —— 听悟风 hero 右侧视觉 */
function VoiceArt() {
  return (
    <div className="relative flex h-[260px] w-full items-center justify-center">
      <svg
        viewBox="0 0 700 240"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        className="h-[80%] w-full"
      >
        <defs>
          <linearGradient id="vg1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c96442" stopOpacity="0" />
            <stop offset="35%" stopColor="#d97757" stopOpacity="0.65" />
            <stop offset="70%" stopColor="#c96442" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#d97757" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="vg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d97757" stopOpacity="0" />
            <stop offset="50%" stopColor="#c96442" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#d97757" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="vdot1">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="40%" stopColor="#d97757" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#d97757" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="vdot2">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="40%" stopColor="#c96442" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#c96442" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 主波纹 1 */}
        <path
          d="M0 120 Q 60 80, 120 120 T 240 120 T 360 120 T 480 120 T 600 120 T 700 120"
          stroke="url(#vg1)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            dur="6s"
            repeatCount="indefinite"
            values="M0 120 Q 60 80, 120 120 T 240 120 T 360 120 T 480 120 T 600 120 T 700 120;
                    M0 120 Q 60 160, 120 120 T 240 120 T 360 120 T 480 120 T 600 120 T 700 120;
                    M0 120 Q 60 80, 120 120 T 240 120 T 360 120 T 480 120 T 600 120 T 700 120"
          />
        </path>

        {/* 主波纹 2 */}
        <path
          d="M0 135 Q 80 105, 160 135 T 320 135 T 480 135 T 640 135 T 700 135"
          stroke="url(#vg2)"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        >
          <animate
            attributeName="d"
            dur="5s"
            repeatCount="indefinite"
            values="M0 135 Q 80 165, 160 135 T 320 135 T 480 135 T 640 135 T 700 135;
                    M0 135 Q 80 105, 160 135 T 320 135 T 480 135 T 640 135 T 700 135;
                    M0 135 Q 80 165, 160 135 T 320 135 T 480 135 T 640 135 T 700 135"
          />
        </path>

        {/* 散落音频条 */}
        <g stroke="#d97757" strokeWidth="1.8" strokeLinecap="round" opacity="0.5">
          <line x1="85" y1="100" x2="85" y2="140" />
          <line x1="155" y1="92" x2="155" y2="148" />
          <line x1="235" y1="100" x2="235" y2="140" />
          <line x1="318" y1="88" x2="318" y2="152" />
          <line x1="402" y1="98" x2="402" y2="142" />
          <line x1="490" y1="95" x2="490" y2="145" />
          <line x1="575" y1="102" x2="575" y2="138" />
          <line x1="660" y1="92" x2="660" y2="148" />
        </g>

        {/* 发光节点 */}
        <circle className="sp-node" cx="155" cy="120" r="12" fill="url(#vdot1)" />
        <circle className="sp-node n2" cx="360" cy="124" r="10" fill="url(#vdot2)" />
        <circle className="sp-node n3" cx="530" cy="118" r="11" fill="url(#vdot1)" />
        <circle className="sp-node n4" cx="630" cy="128" r="8" fill="url(#vdot2)" />
      </svg>
    </div>
  );
}

export default function HomePage() {
  const [recent, setRecent] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecordings(1, 5)
      .then((data) => setRecent(data.items.slice(0, 5)))
      .catch(() => setRecent([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* ===== HERO ===== */}
      <section className="fade-up grid items-center gap-8 py-2 md:grid-cols-[1.2fr_1fr] md:py-6">
        <div>
          <h1 className="font-serif text-[42px] font-semibold leading-[1.18] tracking-[-0.01em] text-text md:text-[54px]">
            让每一段
            <em className="not-italic bg-[linear-gradient(135deg,#c96442_0%,#d97757_100%)] bg-clip-text text-transparent">
              声音
            </em>
            ，<br className="hidden md:block" />落成文字
          </h1>
          <p className="mt-6 max-w-[520px] text-[15px] font-medium leading-[1.7] text-text-dim">
            上传音视频文件，或用浏览器直接录音，自动转写为逐字稿，
            支持导出 Markdown / TXT / SRT / VTT。
          </p>
        </div>
        <VoiceArt />
      </section>

      {/* ===== 3 张场景卡 ===== */}
      <section className="fade-up fade-up-1 grid gap-[18px] py-2 md:grid-cols-3">
        {/* 卡 1：开启实时记录（陶土感） */}
        <Link
          href="/upload"
          className="group relative flex min-h-[256px] flex-col overflow-hidden rounded-xl border border-border bg-[linear-gradient(160deg,#faf9f5_0%,#f4f1ea_70%,#ece8dd_100%)] p-7 shadow-ring shadow-soft transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-[rgba(201,100,66,0.3)] hover:shadow-[0_10px_30px_rgba(20,20,19,0.08)]"
        >
          <span className="absolute right-[18px] top-[18px] rounded-lg bg-accent px-3 py-1 text-[11.5px] font-semibold tracking-wide text-white">
            会议神器
          </span>
          <div className="pointer-events-none absolute -right-8 -top-8 h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle,rgba(201,100,66,0.12),transparent_70%)]" />
          <svg viewBox="0 0 64 64" fill="none" className="relative z-10 mb-5 h-16 w-16 drop-shadow-[0_6px_12px_rgba(20,20,19,.06)]">
            <defs>
              <linearGradient id="rt-a" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d97757" />
                <stop offset="100%" stopColor="#c96442" />
              </linearGradient>
              <linearGradient id="rt-b" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d97757" />
                <stop offset="100%" stopColor="#c96442" />
              </linearGradient>
            </defs>
            {/* 聊天气泡主体 */}
            <rect x="6" y="8" width="40" height="36" rx="11" fill="url(#rt-a)" />
            <path d="M15 40 L15 52 L27 42 Z" fill="url(#rt-a)" />
            {/* 白色声纹竖条 */}
            <g stroke="#fff" strokeWidth="3" strokeLinecap="round">
              <line x1="17" y1="22" x2="17" y2="30" />
              <line x1="24" y1="17" x2="24" y2="35" />
              <line x1="31" y1="20" x2="31" y2="32" />
              <line x1="38" y1="24" x2="38" y2="28" />
            </g>
            {/* 右下双色球 */}
            <circle cx="48" cy="46" r="12" fill="url(#rt-b)" />
            <circle cx="44" cy="42" r="3.5" fill="rgba(255,255,255,.5)" />
          </svg>
          <div className="relative z-10 mb-2.5 font-serif text-[22px] font-semibold tracking-tight text-text">
            开启实时记录
          </div>
          <div className="relative z-10 text-[13px] font-medium leading-[1.7] text-text-dim">
            <p>实时语音转文字</p>
            <p>同步翻译，智能总结要点</p>
          </div>
        </Link>

        {/* 卡 2：上传音视频（象牙感，暖棕图标） */}
        <Link
          href="/upload"
          className="group relative flex min-h-[256px] flex-col overflow-hidden rounded-xl border border-border bg-[linear-gradient(160deg,#faf9f5_0%,#f0eee6_70%,#e8e6dc_100%)] p-7 shadow-ring shadow-soft transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-[rgba(201,100,66,0.3)] hover:shadow-[0_10px_30px_rgba(20,20,19,0.08)]"
        >
          <span className="absolute right-[18px] top-[18px] rounded-lg bg-[#b08968] px-3 py-1 text-[11.5px] font-semibold tracking-wide text-white">
            网课必备
          </span>
          <div className="pointer-events-none absolute -right-8 -top-8 h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle,rgba(176,137,104,0.14),transparent_70%)]" />
          <svg viewBox="0 0 64 64" fill="none" className="relative z-10 mb-5 h-16 w-16 drop-shadow-[0_6px_12px_rgba(20,20,19,.06)]">
            <defs>
              <linearGradient id="uv-a" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c2a07f" />
                <stop offset="100%" stopColor="#b08968" />
              </linearGradient>
              <linearGradient id="uv-b" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d6c2ac" />
                <stop offset="100%" stopColor="#c2a07f" />
              </linearGradient>
            </defs>
            <path d="M10 18 L40 14 L52 22 L52 50 L10 50 Z" fill="url(#uv-b)" opacity="0.55" />
            <path d="M8 24 L38 20 L50 28 L50 56 L8 56 Z" fill="url(#uv-a)" />
            <path d="M38 20 L50 28 L38 32 Z" fill="rgba(255,255,255,.35)" />
            <circle cx="29" cy="42" r="12" fill="#fff" opacity="0.95" />
            <polygon points="26,36 26,48 38,42" fill="#b08968" />
            <circle cx="46" cy="14" r="9" fill="#fff" stroke="#b08968" strokeWidth="1.5" />
            <path d="M46 18 L46 10 M42 14 L46 10 L50 14" stroke="#b08968" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <div className="relative z-10 mb-2.5 font-serif text-[22px] font-semibold tracking-tight text-text">
            上传音视频
          </div>
          <div className="relative z-10 text-[13px] font-medium leading-[1.7] text-text-dim">
            <p>音视频转文字</p>
            <p>区分发言人，一键导出</p>
          </div>
        </Link>

        {/* 卡 3：播客（暖灰感，陶土图标） */}
        <Link
          href="/podcast"
          className="group relative flex min-h-[256px] flex-col overflow-hidden rounded-xl border border-border bg-[linear-gradient(160deg,#f4f1ea_0%,#ece8dd_70%,#e3ddcf_100%)] p-7 shadow-ring shadow-soft transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-[rgba(201,100,66,0.3)] hover:shadow-[0_10px_30px_rgba(20,20,19,0.08)]"
        >
          <span className="absolute right-[18px] top-[18px] rounded-lg bg-accent px-3 py-1 text-[11.5px] font-semibold tracking-wide text-white">
            AI看播客
          </span>
          <div className="pointer-events-none absolute -right-8 -top-8 h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle,rgba(201,100,66,0.12),transparent_70%)]" />
          <svg viewBox="0 0 64 64" fill="none" className="relative z-10 mb-5 h-16 w-16 drop-shadow-[0_6px_12px_rgba(20,20,19,.06)]">
            <defs>
              <linearGradient id="pc-a" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d97757" />
                <stop offset="100%" stopColor="#c96442" />
              </linearGradient>
              <linearGradient id="pc-b" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e3a98f" />
                <stop offset="100%" stopColor="#d97757" />
              </linearGradient>
            </defs>
            {/* 浏览器窗口 */}
            <rect x="8" y="12" width="48" height="38" rx="6" fill="url(#pc-b)" opacity="0.5" />
            <rect x="6" y="16" width="48" height="38" rx="6" fill="url(#pc-a)" />
            <rect x="6" y="16" width="48" height="9" rx="6" fill="rgba(255,255,255,.28)" />
            <circle cx="13" cy="20.5" r="1.6" fill="#fff" />
            <circle cx="19" cy="20.5" r="1.6" fill="#fff" />
            <circle cx="25" cy="20.5" r="1.6" fill="#fff" />
            {/* 链接图标 */}
            <g stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M27 40 L33 34" />
              <path d="M31 31 a5 5 0 0 1 7 7 l-3 3" />
              <path d="M33 47 a5 5 0 0 1 -7 -7 l3 -3" />
            </g>
          </svg>
          <div className="relative z-10 mb-2.5 font-serif text-[22px] font-semibold tracking-tight text-text">
            播客
          </div>
          <div className="relative z-10 text-[13px] font-medium leading-[1.7] text-text-dim">
            <p>订阅节目，集中查看 shownotes</p>
            <p>按需获取单集文字稿</p>
          </div>
        </Link>
      </section>

      {/* ===== 最近转写 ===== */}
      <section className="fade-up fade-up-2 py-6">
        <div className="mb-4 flex items-baseline justify-between">
          <span className="font-serif text-[18px] font-semibold text-text">最近</span>
          <Link
            href="/records"
            className="text-[12px] font-medium text-text-muted transition-colors hover:text-accent"
          >
            查看全部 →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-text-dim">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface py-14 text-center text-[14px] text-text-muted">
            还没有转写记录，从上面选一种方式开始吧
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((r) => {
              const tag = STATUS_TAG[r.status] ?? STATUS_TAG.transcribing;
              return (
                <Link
                  key={r.id}
                  href={`/recordings/${r.id}`}
                  className="flex min-h-[130px] flex-col rounded-lg border border-border bg-surface p-4 shadow-ring transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:border-[rgba(201,100,66,0.3)] hover:shadow-[0_8px_20px_rgba(20,20,19,0.07)]"
                >
                  <div className="mb-2.5 flex items-start justify-between gap-2.5">
                    <div className="line-clamp-2 text-[13.5px] font-semibold leading-[1.4] text-text">
                      {r.title}
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-glow text-accent">
                      <FileAudio size={14} />
                    </div>
                  </div>
                  <div className="mb-2.5">
                    <span className={`rounded px-2 py-0.5 text-[10.5px] font-medium ${tag.className}`}>
                      {tag.label}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between text-[11px] font-medium text-text-muted">
                    <b className="font-semibold text-text-dim">
                      {formatDuration(r.duration)}
                    </b>
                    <span>{formatDate(r.created_at)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
