"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, FileAudio, XCircle } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "我的内容", icon: FileAudio, status: null },
  { href: "/?status=processing", label: "转写中", icon: Clock3, status: "processing" },
  { href: "/?status=done", label: "已完成", icon: CheckCircle2, status: "done" },
  { href: "/?status=failed", label: "失败", icon: XCircle, status: "failed" },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status");

  return (
    <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[228px] shrink-0 border-r border-border bg-surface px-4 py-5 lg:block">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === "/" &&
            (item.status ? currentStatus === item.status : !currentStatus);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors",
                active
                  ? "bg-accent-glow text-accent"
                  : "text-text-dim hover:bg-surface-2 hover:text-text"
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
