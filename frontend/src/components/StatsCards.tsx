"use client";

import { useEffect, useState } from "react";
import { FileAudio, Clock, Loader, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getStats, type StatsResponse } from "@/lib/api";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  color?: string;
}

function StatCard({ label, value, sub, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover:border-border-hover transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-text-muted" />
        <span className="text-xs text-text-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div
        className="text-[28px] font-bold font-mono"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="text-xs text-text-dim mt-1">{sub}</div>
    </div>
  );
}

export default function StatsCards() {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-9">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-xl p-5 h-[108px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 mb-9">
      <StatCard
        label="总录音数"
        value={stats.total_count}
        sub={`共 ${stats.total_count} 条录音`}
        icon={FileAudio}
      />
      <StatCard
        label="总时长"
        value={formatDuration(stats.total_duration)}
        sub="所有录音累计时长"
        icon={Clock}
        color="var(--accent)"
      />
      <StatCard
        label="待处理"
        value={stats.pending_count}
        sub={stats.pending_count > 0 ? "正在处理中" : "全部已完成"}
        icon={Loader}
        color="var(--warning)"
      />
      <StatCard
        label="本周新增"
        value={stats.week_count}
        sub="本周上传录音数"
        icon={TrendingUp}
        color="var(--success)"
      />
    </div>
  );
}
