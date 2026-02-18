"use client";

import Link from "next/link";
import { Capability } from "@/lib/types";
import { useLocale } from "@/i18n";

// ==================== 饼图颜色 ====================
const PIE_COLORS = [
  "#10b981",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

// ==================== Props ====================
interface StatsClientProps {
  total: number;
  avgScore: string;
  categoryCount: number;
  hasTestsCount: number;
  hasTestsPercent: number;
  categoryDist: { category: string; label: string; count: number; percentage: number }[];
  scoreDist: { label: string; min: number; max: number; count: number }[];
  langDist: { language: string; count: number }[];
  top10: Capability[];
  recent10: Capability[];
}

// ==================== SVG 饼图 ====================
function PieChart({
  data,
}: {
  data: { label: string; count: number; percentage: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const cumulativeAngles: number[] = [];
  data.reduce((acc, d) => {
    cumulativeAngles.push(acc);
    return acc + (d.count / total) * 360;
  }, 0);

  const slices = data.map((d, i) => {
    const angle = (d.count / total) * 360;
    const startAngle = cumulativeAngles[i];
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((startAngle + angle - 90) * Math.PI) / 180;
    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    const pathD =
      angle >= 359.99
        ? `M 100 20 A 80 80 0 1 1 99.99 20 Z`
        : `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return (
      <path
        key={i}
        d={pathD}
        fill={PIE_COLORS[i % PIE_COLORS.length]}
        stroke="#09090b"
        strokeWidth="1"
      />
    );
  });

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-10">
      <svg viewBox="0 0 200 200" className="h-40 w-40 sm:h-52 sm:w-52 shrink-0">
        {slices}
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            <span className="text-zinc-300">
              {d.label}{" "}
              <span className="text-zinc-500">
                {d.count} ({d.percentage}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 统计卡片 ====================
function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "emerald" | "blue" | "purple" | "amber";
}) {
  const colorMap = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-3 sm:p-5 ${colorMap[color]}`}>
      <p className="text-xs sm:text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl sm:text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

// ==================== 区块标题 ====================
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-xl font-semibold text-zinc-100">{children}</h2>;
}

// ==================== 主组件 ====================
export default function StatsClient({
  total,
  avgScore,
  categoryCount,
  hasTestsCount,
  hasTestsPercent,
  categoryDist,
  scoreDist,
  langDist,
  top10,
  recent10,
}: StatsClientProps) {
  const { locale } = useLocale();
  const isZh = locale === "zh";

  const maxScoreBin = Math.max(...scoreDist.map((b) => b.count), 1);
  const maxLangCount = Math.max(...langDist.map((l) => l.count), 1);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(isZh ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
      {/* 页面标题 */}
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        AgentStore{" "}
        <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
          {isZh ? "生态数据面板" : "Ecosystem Dashboard"}
        </span>
      </h1>
      <p className="mb-10 text-zinc-400">
        {isZh
          ? "实时统计 AgentStore 收录的 Agent 能力生态数据"
          : "Live statistics for all Agent capabilities in AgentStore"}
      </p>

      {/* 统计卡片 */}
      <section className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={isZh ? "总插件数" : "Total Plugins"} value={String(total)} color="emerald" />
        <StatCard label={isZh ? "平均评分" : "Avg. Score"} value={avgScore} color="blue" />
        <StatCard label={isZh ? "分类数量" : "Categories"} value={String(categoryCount)} color="purple" />
        <StatCard
          label={isZh ? "测试覆盖率" : "Test Coverage"}
          value={`${hasTestsPercent}%`}
          sub={`${hasTestsCount} / ${total}`}
          color="amber"
        />
      </section>

      {/* 分类分布 */}
      <section className="mb-12">
        <SectionTitle>{isZh ? "分类分布" : "Category Distribution"}</SectionTitle>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <PieChart data={categoryDist} />
        </div>
      </section>

      {/* 评分分布 */}
      <section className="mb-12">
        <SectionTitle>{isZh ? "评分分布" : "Score Distribution"}</SectionTitle>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-end gap-3 h-48">
            {scoreDist.map((bin) => (
              <div key={bin.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs text-zinc-400">{bin.count}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all"
                  style={{
                    height: `${Math.max((bin.count / maxScoreBin) * 100, 2)}%`,
                    minHeight: "4px",
                  }}
                />
                <span className="text-xs text-zinc-500">{bin.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 语言分布 */}
      <section className="mb-12">
        <SectionTitle>{isZh ? "编程语言 Top 10" : "Top 10 Languages"}</SectionTitle>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="space-y-3">
            {langDist.map((item, i) => (
              <div key={item.language} className="flex items-center gap-3">
                <span className="w-16 sm:w-24 shrink-0 text-right text-xs sm:text-sm text-zinc-300">
                  {item.language}
                </span>
                <div className="relative flex-1 h-6 rounded-md bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-md"
                    style={{
                      width: `${(item.count / maxLangCount) * 100}%`,
                      backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="w-10 shrink-0 text-sm text-zinc-400">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top 10 高分 */}
      <section className="mb-12">
        <SectionTitle>{isZh ? "Top 10 高分插件" : "Top 10 by Score"}</SectionTitle>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
                <th className="px-3 sm:px-4 py-3 font-medium">#</th>
                <th className="px-3 sm:px-4 py-3 font-medium">{isZh ? "名称" : "Name"}</th>
                <th className="px-3 sm:px-4 py-3 font-medium">{isZh ? "分类" : "Category"}</th>
                <th className="px-3 sm:px-4 py-3 font-medium text-right">{isZh ? "总分" : "Score"}</th>
                <th className="px-3 sm:px-4 py-3 font-medium text-right">Stars</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((cap, i) => (
                <tr
                  key={cap.slug}
                  className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/40"
                >
                  <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/capability/${cap.slug}`}
                      className="text-blue-400 transition-colors hover:text-blue-300 hover:underline"
                    >
                      {cap.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{cap.category}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                    {cap.overall_score.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {cap.stars.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 最近更新 */}
      <section className="mb-12">
        <SectionTitle>{isZh ? "最近更新" : "Recently Updated"}</SectionTitle>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
                <th className="px-4 py-3 font-medium">{isZh ? "名称" : "Name"}</th>
                <th className="px-4 py-3 font-medium">{isZh ? "更新时间" : "Updated"}</th>
                <th className="px-4 py-3 font-medium text-right">{isZh ? "评分" : "Score"}</th>
              </tr>
            </thead>
            <tbody>
              {recent10.map((cap) => (
                <tr
                  key={cap.slug}
                  className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/capability/${cap.slug}`}
                      className="text-blue-400 transition-colors hover:text-blue-300 hover:underline"
                    >
                      {cap.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{formatDate(cap.last_updated)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                    {cap.overall_score.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
