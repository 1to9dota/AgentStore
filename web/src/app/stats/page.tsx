import { getAllCapabilities } from "@/lib/data";
import { Capability, CATEGORIES } from "@/lib/types";
import Link from "next/link";

// ==================== 工具函数 ====================

/** 计算分类分布 */
function getCategoryDistribution(caps: Capability[]) {
  const map: Record<string, number> = {};
  for (const c of caps) {
    map[c.category] = (map[c.category] || 0) + 1;
  }
  return Object.entries(map)
    .map(([category, count]) => ({
      category,
      label: CATEGORIES[category] || category,
      count,
      percentage: Math.round((count / caps.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

/** 计算评分分布直方图 */
function getScoreDistribution(caps: Capability[]) {
  const bins = [
    { label: "0-2", min: 0, max: 2, count: 0 },
    { label: "2-4", min: 2, max: 4, count: 0 },
    { label: "4-6", min: 4, max: 6, count: 0 },
    { label: "6-8", min: 6, max: 8, count: 0 },
    { label: "8-10", min: 8, max: 10, count: 0 },
  ];
  for (const c of caps) {
    const score = c.overall_score;
    for (const bin of bins) {
      if (score >= bin.min && (score < bin.max || (bin.max === 10 && score <= 10))) {
        bin.count++;
        break;
      }
    }
  }
  return bins;
}

/** 计算语言分布 Top 10 */
function getLanguageDistribution(caps: Capability[]) {
  const map: Record<string, number> = {};
  for (const c of caps) {
    const lang = c.language || "Unknown";
    map[lang] = (map[lang] || 0) + 1;
  }
  return Object.entries(map)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// ==================== 饼图颜色 ====================
const PIE_COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#a855f7", // purple-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#84cc16", // lime-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
];

// ==================== SVG 饼图组件 ====================
function PieChart({ data }: { data: { label: string; count: number; percentage: number; category: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  let cumulativeAngle = 0;

  // 生成饼图扇形路径
  const slices = data.map((d, i) => {
    const angle = (d.count / total) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((startAngle + angle - 90) * Math.PI) / 180;

    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const pathD =
      angle >= 359.99
        ? // 完整圆（避免 SVG 弧线 bug）
          `M 100 20 A 80 80 0 1 1 99.99 20 Z`
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
      {/* SVG 饼图 */}
      <svg viewBox="0 0 200 200" className="h-52 w-52 shrink-0">
        {slices}
      </svg>
      {/* 图例 */}
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

// ==================== 页面主体 ====================
export default function StatsPage() {
  const capabilities = getAllCapabilities();
  const total = capabilities.length;

  // 基础统计
  const avgScore =
    total > 0
      ? (capabilities.reduce((s, c) => s + c.overall_score, 0) / total).toFixed(1)
      : "0";
  const categoryCount = new Set(capabilities.map((c) => c.category)).size;
  const hasTestsCount = capabilities.filter((c) => c.has_tests).length;
  const hasTestsPercent = total > 0 ? Math.round((hasTestsCount / total) * 100) : 0;

  // 各维度数据
  const categoryDist = getCategoryDistribution(capabilities);
  const scoreDist = getScoreDistribution(capabilities);
  const langDist = getLanguageDistribution(capabilities);

  // Top 10 高分插件
  const top10 = [...capabilities].sort((a, b) => b.overall_score - a.overall_score).slice(0, 10);

  // 最近更新的 10 个插件
  const recent10 = [...capabilities]
    .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
    .slice(0, 10);

  // 评分直方图最大值（用于计算柱高比例）
  const maxScoreBin = Math.max(...scoreDist.map((b) => b.count), 1);
  // 语言条形图最大值
  const maxLangCount = Math.max(...langDist.map((l) => l.count), 1);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* 页面标题 */}
      <h1 className="mb-2 text-3xl font-bold tracking-tight">
        AgentStore{" "}
        <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
          生态数据面板
        </span>
      </h1>
      <p className="mb-10 text-zinc-400">
        实时统计 AgentStore 收录的 Agent 能力生态数据
      </p>

      {/* ========== 统计卡片区域 ========== */}
      <section className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="总插件数" value={String(total)} color="emerald" />
        <StatCard label="平均评分" value={avgScore} color="blue" />
        <StatCard label="分类数量" value={String(categoryCount)} color="purple" />
        <StatCard
          label="测试覆盖率"
          value={`${hasTestsPercent}%`}
          sub={`${hasTestsCount} / ${total}`}
          color="amber"
        />
      </section>

      {/* ========== 分类分布饼图 ========== */}
      <section className="mb-12">
        <SectionTitle>分类分布</SectionTitle>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <PieChart data={categoryDist} />
        </div>
      </section>

      {/* ========== 评分分布直方图 ========== */}
      <section className="mb-12">
        <SectionTitle>评分分布</SectionTitle>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-end gap-3 h-48">
            {scoreDist.map((bin) => (
              <div key={bin.label} className="flex flex-1 flex-col items-center gap-2">
                {/* 柱体 */}
                <span className="text-xs text-zinc-400">{bin.count}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all"
                  style={{
                    height: `${Math.max((bin.count / maxScoreBin) * 100, 2)}%`,
                    minHeight: "4px",
                  }}
                />
                {/* 标签 */}
                <span className="text-xs text-zinc-500">{bin.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 语言分布排行 ========== */}
      <section className="mb-12">
        <SectionTitle>编程语言 Top 10</SectionTitle>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="space-y-3">
            {langDist.map((item, i) => (
              <div key={item.language} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-right text-sm text-zinc-300">
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

      {/* ========== Top 10 高分插件表格 ========== */}
      <section className="mb-12">
        <SectionTitle>Top 10 高分插件</SectionTitle>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">分类</th>
                <th className="px-4 py-3 font-medium text-right">总分</th>
                <th className="px-4 py-3 font-medium text-right">Stars</th>
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
                  <td className="px-4 py-3 text-zinc-400">
                    {CATEGORIES[cap.category] || cap.category}
                  </td>
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

      {/* ========== 最近更新的 10 个插件 ========== */}
      <section className="mb-12">
        <SectionTitle>最近更新</SectionTitle>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-400">
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">更新时间</th>
                <th className="px-4 py-3 font-medium text-right">评分</th>
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
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(cap.last_updated).toLocaleDateString("zh-CN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </td>
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

// ==================== 子组件 ====================

/** 统计卡片 */
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
    <div
      className={`rounded-xl border bg-gradient-to-br p-5 ${colorMap[color]}`}
    >
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

/** 区块标题 */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xl font-semibold text-zinc-100">{children}</h2>
  );
}
