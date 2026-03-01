"use client";

import { useEffect, useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { getProcessingRecordings, type ProcessingItem } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  uploading: "上传中",
  transcribing: "转录中",
  analyzing: "分析中",
};

export default function ProcessingList() {
  const [items, setItems] = useState<ProcessingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const data = await getProcessingRecordings();
        if (active) setItems(data.items);
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between text-base font-semibold mb-4">
          处理中
        </div>
        <div className="bg-surface border border-border rounded-lg p-6 animate-pulse h-20" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-base font-semibold mb-4">
        处理中
        <span className="text-xs font-medium text-accent bg-accent-glow px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-surface border border-border rounded-lg px-5 py-4 flex items-center gap-4 hover:border-border-hover transition-colors"
          >
            <div className="w-10 h-10 rounded-md bg-accent-glow flex items-center justify-center shrink-0">
              <Mic size={18} className="text-accent" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-text-dim mt-1">
                {new Date(item.created_at).toLocaleString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" 上传"}
              </p>
            </div>

            <div className="w-[120px] h-1 bg-surface-3 rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${item.progress}%` }}
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium text-accent whitespace-nowrap">
              <Loader2 size={12} className="animate-spin" />
              {STATUS_LABELS[item.status] || item.status} {item.progress}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
