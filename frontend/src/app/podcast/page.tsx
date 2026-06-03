"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2 } from "lucide-react";
import { createPodcast } from "@/lib/api";

export default function PodcastPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = url.trim().startsWith("http") && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      await createPodcast({ url: url.trim(), title: title.trim() || undefined });
      router.push("/");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "提交失败，请检查链接后重试";
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[720px] mx-auto py-6">
      <h1 className="text-2xl font-bold text-center mb-2">播客链接转写</h1>
      <p className="text-center text-text-dim text-sm mb-9">
        粘贴单集播客链接，无需下载，自动转写并生成摘要
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 链接输入 */}
        <div>
          <label className="block text-base font-semibold mb-4">播客链接</label>
          <div className="relative">
            <Link2
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="url"
              placeholder="https://www.xiaoyuzhoufm.com/episode/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
              className="w-full pl-11 pr-4 py-3.5 rounded-lg border border-border bg-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-text-muted">
            支持小宇宙单集网页链接，或直接粘贴音频文件地址（.mp3 / .m4a 等）。
          </p>
        </div>

        {/* 补充信息 */}
        <div>
          <h3 className="text-base font-semibold mb-4">标题（可选）</h3>
          <input
            type="text"
            placeholder="留空则自动读取播客标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-sm placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-[var(--accent-3)] font-medium">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-lg bg-accent text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              提交中...
            </>
          ) : (
            "开始转写"
          )}
        </button>
      </form>
    </div>
  );
}
