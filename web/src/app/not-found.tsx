"use client";

import Link from "next/link";
import { useLocale } from "@/i18n";

// 自定义 404 页面 — 暗色主题 + 设计感
export default function NotFound() {
  const { t } = useLocale();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-6 text-center">
      {/* 大号 404 数字，带渐变效果 */}
      <div className="relative">
        <h1 className="text-[10rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-zinc-300 to-zinc-700 sm:text-[12rem]">
          404
        </h1>
        {/* 背景光晕 */}
        <div className="absolute inset-0 -z-10 blur-3xl opacity-20">
          <div className="mx-auto h-48 w-48 rounded-full bg-blue-500" />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-zinc-100">{t.pages.not_found_title}</h2>
        <p className="text-sm text-zinc-400 max-w-md">{t.pages.not_found_desc}</p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {t.pages.back_home}
        </Link>
        <Link
          href="/search"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
        >
          {t.pages.search_plugins}
        </Link>
      </div>
    </div>
  );
}
