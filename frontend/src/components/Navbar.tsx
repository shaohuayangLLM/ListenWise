"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Upload, Library, Settings } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/upload", label: "上传录音", icon: Upload },
  { href: "/library", label: "录音库", icon: Library },
  { href: "/settings", label: "设置", icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-accent">
          ListenWise
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  isActive
                    ? "bg-accent text-white"
                    : "text-text-dim hover:bg-surface-2 hover:text-text"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
