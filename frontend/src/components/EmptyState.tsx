import Link from "next/link";
import { Upload, Search, FolderOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-5">
        <Icon size={24} className="text-text-muted" />
      </div>
      <p className="text-[15px] font-medium text-text mb-1.5">{title}</p>
      {description && (
        <p className="text-sm text-text-muted max-w-[320px]">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Upload size={14} />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function SearchEmpty() {
  return (
    <EmptyState
      icon={Search}
      title="未找到匹配结果"
      description="试试更换关键词或清除筛选条件"
    />
  );
}
