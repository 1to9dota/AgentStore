"use client";

import Link from "next/link";
import { Capability, CATEGORIES } from "@/lib/types";
import ScoreBadge from "./ScoreBadge";
import { useLocale } from "@/i18n";

interface SimilarPluginsProps {
  current: Capability;
  allCapabilities: Capability[];
}

/**
 * 相似插件推荐
 * 算法：同分类 + 评分相近的 Top 5，排除当前插件
 */
export default function SimilarPlugins({
  current,
  allCapabilities,
}: SimilarPluginsProps) {
  const { t } = useLocale();

  const similar = allCapabilities
    .filter((c) => c.slug !== current.slug && c.category === current.category)
    .map((c) => ({
      ...c,
      scoreDiff: Math.abs(c.overall_score - current.overall_score),
    }))
    .sort((a, b) => a.scoreDiff - b.scoreDiff)
    .slice(0, 5);

  if (similar.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="mb-4 text-lg font-semibold text-zinc-200">
        {t.similar.title}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scroll-smooth touch-pan-x [-webkit-overflow-scrolling:touch]">
        {similar.map((cap) => (
          <Link
            key={cap.slug}
            href={`/capability/${cap.slug}`}
            className="group flex min-w-[200px] shrink-0 flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-all hover:border-zinc-600 hover:bg-zinc-800/80 active:scale-[0.98]"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-sm font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
                {cap.name}
              </h3>
              <ScoreBadge score={cap.overall_score} size="sm" />
            </div>
            <p className="mt-2 text-xs text-zinc-500 line-clamp-2">
              {cap.one_liner}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <span className="rounded-md bg-zinc-800 px-2 py-0.5">
                {CATEGORIES[cap.category] || cap.category}
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {cap.stars.toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
