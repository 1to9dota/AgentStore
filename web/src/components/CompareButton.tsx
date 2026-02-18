"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n";

interface CompareButtonProps {
  slug: string;
  className?: string;
}

// "添加到对比"按钮，点击后跳转到对比页并携带当前 slug
export default function CompareButton({ slug, className }: CompareButtonProps) {
  const router = useRouter();
  const { t } = useLocale();

  const handleClick = () => {
    // 读取当前 URL 中已有的 slugs 参数
    const params = new URLSearchParams(window.location.search);
    const existing = params.get("slugs");
    const slugs = existing ? existing.split(",").filter(Boolean) : [];

    // 避免重复添加，最多 4 个
    if (!slugs.includes(slug)) {
      if (slugs.length >= 4) {
        alert(t.compare_page.max_alert);
        return;
      }
      slugs.push(slug);
    }

    router.push(`/compare?slugs=${slugs.join(",")}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-blue-500/50 hover:bg-zinc-800 hover:text-blue-400 ${className || ""}`}
    >
      {/* 对比图标 */}
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      {t.compare_page.add_to_compare}
    </button>
  );
}
