"use client";

import { useLocale } from "@/i18n";

// 全局错误边界 — 友好的错误页面 + 重试按钮
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      {/* 错误图标 */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
        <svg
          className="h-10 w-10 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-100">{t.pages.error_title}</h1>
        <p className="text-sm text-zinc-400">{t.pages.error_desc}</p>
        {/* 开发环境显示错误详情 */}
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="mx-auto mt-2 max-w-md rounded-lg bg-zinc-900 p-3 font-mono text-xs text-red-400/80">
            {error.message}
          </p>
        )}
      </div>

      <button
        onClick={reset}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        {t.pages.retry}
      </button>
    </div>
  );
}
