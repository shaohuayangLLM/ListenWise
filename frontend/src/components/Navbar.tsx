"use client";

import Link from "next/link";
import { Mic, Search, Upload } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="flex min-h-[72px] flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap md:gap-6 md:px-8 md:py-0">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-3 text-[20px] font-bold text-text md:w-[196px] md:flex-none"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-[15px] font-bold text-white">
            L
          </span>
          <span className="truncate">ListenWise</span>
        </Link>

        <div className="order-3 w-full min-w-0 md:order-none md:max-w-[680px] md:flex-1">
          <form action="/" className="relative">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim"
            />
            <input
              name="q"
              type="search"
              placeholder="搜索转写"
              className="h-11 w-full rounded-lg border border-border bg-surface pl-11 pr-4 text-[15px] text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent"
            />
          </form>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
          <Link
            href="/upload"
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-accent px-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90 md:px-4"
          >
            <Mic size={17} />
            录音
          </Link>
          <Link
            href="/upload"
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-border-hover bg-white px-3 text-[14px] font-medium text-text transition-colors hover:border-accent hover:text-accent md:px-4"
          >
            <Upload size={17} />
            上传
          </Link>
        </div>
      </div>
    </nav>
  );
}
