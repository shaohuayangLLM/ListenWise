import Link from "next/link";
import {
  Upload,
  Mic,
  Search,
  FolderOpen,
} from "lucide-react";
import StatsCards from "@/components/StatsCards";
import ProcessingList from "@/components/ProcessingList";
import RecentRecordings from "@/components/RecentRecordings";

export default function Home() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-9">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">
            欢迎回来
          </h1>
          <p className="text-sm text-text-dim mt-1">
            ListenWise - 智能录音转文档平台
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-[0_4px_16px_var(--accent-glow)]"
        >
          <Upload size={16} />
          上传录音
        </Link>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Main Grid: Content + Sidebar */}
      <div className="grid grid-cols-[1fr_360px] gap-6">
        {/* Left Column */}
        <div>
          <ProcessingList />
          <RecentRecordings />
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Quick Actions */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-3.5">快捷操作</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickAction href="/upload" icon={FolderOpen} label="上传文件" />
              <QuickAction href="/upload" icon={Mic} label="开始录音" />
              <QuickAction href="/library" icon={Search} label="搜索内容" />
              <QuickAction href="/library" icon={Upload} label="批量上传" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Upload;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 py-4 px-3 bg-surface-2 border border-border rounded-lg hover:border-accent hover:bg-surface-3 transition-all"
    >
      <Icon size={20} className="text-text-dim" />
      <span className="text-xs text-text-dim">{label}</span>
    </Link>
  );
}
