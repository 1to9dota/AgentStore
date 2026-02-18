import Link from "next/link";
import { Capability, CATEGORIES } from "@/lib/types";
import ScoreBadge from "./ScoreBadge";

interface TrendingSectionProps {
  capabilities: Capability[];
}

/**
 * 趋势模块 — Server Component
 * 展示"本周热门"（按 stars 排序）和"最近更新"（按 last_updated 排序）
 */
export default function TrendingSection({ capabilities }: TrendingSectionProps) {
  // 按 stars 降序取 Top 5
  const topByStars = [...capabilities]
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 5);

  // 按 last_updated 降序取 Top 5
  const recentlyUpdated = [...capabilities]
    .sort(
      (a, b) =>
        new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
    )
    .slice(0, 5);

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      {/* 本周热门 */}
      <div className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-zinc-200">
          <span className="text-2xl">🔥</span>
          本周热门
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {topByStars.map((cap) => (
            <TrendingCard key={cap.slug} capability={cap} />
          ))}
        </div>
      </div>

      {/* 最近更新 */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-zinc-200">
          <span className="text-2xl">🆕</span>
          最近更新
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {recentlyUpdated.map((cap) => (
            <TrendingCard key={cap.slug} capability={cap} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** 趋势小卡片 — 展示名称、评分、Stars、分类 */
function TrendingCard({ capability }: { capability: Capability }) {
  const { slug, name, overall_score, stars, category } = capability;

  return (
    <Link
      href={`/capability/${slug}`}
      className="group flex min-w-[220px] shrink-0 flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-zinc-600 hover:bg-zinc-800/80"
    >
      {/* 顶部：名称 + 评分 */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
          {name}
        </h3>
        <ScoreBadge score={overall_score} size="sm" />
      </div>

      {/* 底部：Stars + 分类标签 */}
      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
        {/* Stars */}
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {stars.toLocaleString()}
        </span>

        {/* 分类标签 */}
        <span className="rounded-md bg-zinc-800 px-2 py-0.5">
          {CATEGORIES[category] || category}
        </span>
      </div>
    </Link>
  );
}
