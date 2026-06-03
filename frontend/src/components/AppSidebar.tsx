"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileAudio, Home } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/records", label: "我的记录", icon: FileAudio },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[228px] shrink-0 border-r border-border bg-surface px-4 py-5 lg:block">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

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
