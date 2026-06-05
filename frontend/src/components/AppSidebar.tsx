"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileAudio, Home, Podcast, Settings } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/podcast", label: "播客", icon: Podcast },
  { href: "/records", label: "我的记录", icon: FileAudio },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const item = (href: string, label: string, Icon: typeof Home) => (
    <Link
      key={href}
      href={href}
      className={clsx(
        "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-[background-color,color,box-shadow] duration-200 ease-[cubic-bezier(.16,1,.3,1)]",
        isActive(href)
          ? "bg-accent-glow text-accent shadow-[inset_0_0_0_1px_var(--accent-glow)]"
          : "text-text-dim hover:bg-surface-2 hover:text-text"
      )}
    >
      <Icon size={18} className={clsx(isActive(href) && "text-accent")} />
      <span>{label}</span>
    </Link>
  );

  return (
    <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[228px] shrink-0 flex-col border-r border-border bg-surface px-4 py-5 lg:flex">
      <nav className="space-y-1">
        {navItems.map((n) => item(n.href, n.label, n.icon))}
      </nav>
      <div className="flex-1" />
      <nav className="space-y-1">{item("/settings", "设置", Settings)}</nav>
    </aside>
  );
}
