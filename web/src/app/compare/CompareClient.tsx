"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CapabilityScores, CATEGORIES, SCORE_LABELS } from "@/lib/types";

// 对比页所需的精简数据类型
interface CompareCapability {
  slug: string;
  name: string;
  category: string;
  source: string;
  overall_score: number;
  scores: CapabilityScores;
  stars: number;
  forks: number;
  language: string | null;
  has_tests: boolean;
  has_typescript: boolean;
  last_updated: string;
  one_liner: string;
  provider: string;
}

interface CompareClientProps {
  allCapabilities: CompareCapability[];
}

// 雷达图颜色方案（最多 4 个插件）
const CHART_COLORS = [
  { fill: "rgba(59,130,246,0.2)", stroke: "#3B82F6", dot: "#3B82F6" },   // 蓝色
  { fill: "rgba(16,185,129,0.2)", stroke: "#10B981", dot: "#10B981" },   // 绿色
  { fill: "rgba(245,158,11,0.2)", stroke: "#F59E0B", dot: "#F59E0B" },   // 橙色
  { fill: "rgba(168,85,247,0.2)", stroke: "#A855F7", dot: "#A855F7" },   // 紫色
];

const DIMENSIONS: (keyof CapabilityScores)[] = [
  "reliability",
  "safety",
  "capability",
  "reputation",
  "usability",
];

// 极坐标转直角坐标
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleIndex: number,
  total: number
): [number, number] {
  const angle = (Math.PI * 2 * angleIndex) / total - Math.PI / 2;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

// 生成正多边形的顶点字符串
function makePolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  total: number
): string {
  return Array.from({ length: total })
    .map((_, i) => polarToCartesian(cx, cy, radius, i, total).join(","))
    .join(" ");
}

// 叠加雷达图组件
function CompareRadarChart({
  items,
  size = 300,
}: {
  items: CompareCapability[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.35;
  const total = DIMENSIONS.length;
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const labelRadius = maxRadius + 28;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="drop-shadow-lg mx-auto w-56 h-56 sm:w-72 sm:h-72 lg:w-80 lg:h-80"
    >
      {/* 背景网格 */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={makePolygonPoints(cx, cy, maxRadius * level, total)}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      ))}

      {/* 轴线 */}
      {DIMENSIONS.map((_, i) => {
        const [x, y] = polarToCartesian(cx, cy, maxRadius, i, total);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        );
      })}

      {/* 每个插件的数据多边形 */}
      {items.map((item, idx) => {
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        const dataPoints = DIMENSIONS.map((dim, i) => {
          const value = item.scores[dim] / 10;
          return polarToCartesian(cx, cy, maxRadius * value, i, total);
        });
        const polygon = dataPoints.map((p) => p.join(",")).join(" ");

        return (
          <g key={item.slug}>
            <polygon
              points={polygon}
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={2}
            />
            {dataPoints.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={3.5} fill={color.dot} />
            ))}
          </g>
        );
      })}

      {/* 轴标签 */}
      {DIMENSIONS.map((dim, i) => {
        const [x, y] = polarToCartesian(cx, cy, labelRadius, i, total);
        return (
          <text
            key={dim}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-zinc-400"
            fontSize={12}
          >
            {SCORE_LABELS[dim]}
          </text>
        );
      })}
    </svg>
  );
}

export default function CompareClient({ allCapabilities }: CompareClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从 URL 参数解析已选 slugs
  const selectedSlugs = useMemo(() => {
    const raw = searchParams.get("slugs") || "";
    return raw.split(",").filter(Boolean).slice(0, 4);
  }, [searchParams]);

  // 根据 slugs 查找完整数据
  const selectedItems = useMemo(() => {
    return selectedSlugs
      .map((s) => allCapabilities.find((c) => c.slug === s))
      .filter(Boolean) as CompareCapability[];
  }, [selectedSlugs, allCapabilities]);

  // 搜索框状态
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // 实时搜索结果（排除已选）
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allCapabilities
      .filter(
        (c) =>
          !selectedSlugs.includes(c.slug) &&
          (c.name.toLowerCase().includes(q) ||
            c.slug.toLowerCase().includes(q) ||
            (c.one_liner && c.one_liner.toLowerCase().includes(q)))
      )
      .slice(0, 8);
  }, [query, allCapabilities, selectedSlugs]);

  // 更新 URL 参数
  const updateSlugs = (slugs: string[]) => {
    if (slugs.length === 0) {
      router.push("/compare");
    } else {
      router.push(`/compare?slugs=${slugs.join(",")}`);
    }
  };

  // 添加插件到对比列表
  const addItem = (slug: string) => {
    if (selectedSlugs.length >= 4) return;
    if (selectedSlugs.includes(slug)) return;
    updateSlugs([...selectedSlugs, slug]);
    setQuery("");
    setShowDropdown(false);
  };

  // 从对比列表移除
  const removeItem = (slug: string) => {
    updateSlugs(selectedSlugs.filter((s) => s !== slug));
  };

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = () => setShowDropdown(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // 对比表格的行定义
  const scoreKeys = DIMENSIONS;



  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      {/* 页面标题 */}
      <h1 className="text-3xl font-bold text-zinc-100 mb-2">插件对比</h1>
      <p className="text-zinc-400 mb-8">
        横向对比最多 4 个插件的评分、特性与数据
      </p>

      {/* 搜索添加区域 */}
      <div className="mb-8">
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            placeholder="搜索插件名称，添加到对比..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={selectedSlugs.length >= 4}
          />
          {selectedSlugs.length >= 4 && (
            <span className="ml-3 text-sm text-zinc-500">
              已达上限（最多 4 个）
            </span>
          )}

          {/* 搜索结果下拉 */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
              {searchResults.map((cap) => (
                <button
                  key={cap.slug}
                  onClick={() => addItem(cap.slug)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-zinc-100">{cap.name}</span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {cap.overall_score.toFixed(1)} 分
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {CATEGORIES[cap.category] || cap.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 已选插件标签 */}
        {selectedItems.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedItems.map((item, idx) => (
              <span
                key={item.slug}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
                style={{
                  borderColor: CHART_COLORS[idx].stroke,
                  backgroundColor: CHART_COLORS[idx].fill,
                  color: CHART_COLORS[idx].stroke,
                }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[idx].dot }}
                />
                <Link
                  href={`/capability/${item.slug}`}
                  className="hover:underline"
                >
                  {item.name}
                </Link>
                <button
                  onClick={() => removeItem(item.slug)}
                  className="ml-1 opacity-60 transition-opacity hover:opacity-100"
                  aria-label={`移除 ${item.name}`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 无选择时的提示 */}
      {selectedItems.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-zinc-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="mt-4 text-zinc-400">
            在上方搜索并添加插件开始对比
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            也可以从插件详情页点击&ldquo;添加到对比&rdquo;按钮
          </p>
        </div>
      )}

      {/* 有选择时显示对比内容 */}
      {selectedItems.length >= 1 && (
        <div className="space-y-8">
          {/* 叠加雷达图 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-200">
              五维评分对比
            </h2>
            <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
              <CompareRadarChart items={selectedItems} size={320} />
              {/* 图例 */}
              <div className="flex flex-wrap gap-4 lg:flex-col lg:gap-2 lg:pt-8">
                {selectedItems.map((item, idx) => (
                  <div key={item.slug} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[idx].dot }}
                    />
                    <span className="text-zinc-300">{item.name}</span>
                    <span className="text-zinc-500">
                      {item.overall_score.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 对比表格 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="sticky left-0 bg-zinc-900 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    属性
                  </th>
                  {selectedItems.map((item, idx) => (
                    <th
                      key={item.slug}
                      className="px-4 py-3 text-left text-sm font-semibold"
                      style={{ color: CHART_COLORS[idx].stroke }}
                    >
                      <Link
                        href={`/capability/${item.slug}`}
                        className="hover:underline"
                      >
                        {item.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {/* 基本信息行 */}
                <TableRow label="分类" values={selectedItems.map((c) => CATEGORIES[c.category] || c.category)} />
                <TableRow label="来源" values={selectedItems.map((c) => c.source.toUpperCase())} />

                {/* 总分行（高亮最高） */}
                <ScoreRow
                  label="总分"
                  values={selectedItems.map((c) => c.overall_score)}
                />

                {/* 五维分数行 */}
                {scoreKeys.map((key) => (
                  <ScoreRow
                    key={key}
                    label={SCORE_LABELS[key]}
                    values={selectedItems.map((c) => c.scores[key])}
                  />
                ))}

                {/* 项目数据行 */}
                <ScoreRow
                  label="Stars"
                  values={selectedItems.map((c) => c.stars)}
                  format="int"
                />
                <ScoreRow
                  label="Forks"
                  values={selectedItems.map((c) => c.forks)}
                  format="int"
                />
                <TableRow label="语言" values={selectedItems.map((c) => c.language || "-")} />
                <TableRow
                  label="测试"
                  values={selectedItems.map((c) => c.has_tests ? "有" : "无")}
                  highlight={(v) => v === "有"}
                />
                <TableRow
                  label="TypeScript"
                  values={selectedItems.map((c) => c.has_typescript ? "有" : "无")}
                  highlight={(v) => v === "有"}
                />
                <TableRow
                  label="更新时间"
                  values={selectedItems.map((c) =>
                    new Date(c.last_updated).toLocaleDateString("zh-CN")
                  )}
                />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// 通用文本行
function TableRow({
  label,
  values,
  highlight,
}: {
  label: string;
  values: string[];
  highlight?: (v: string) => boolean;
}) {
  return (
    <tr>
      <td className="sticky left-0 bg-zinc-900 px-4 py-2.5 text-zinc-500 font-medium whitespace-nowrap">
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-4 py-2.5 text-zinc-300 ${
            highlight && highlight(v) ? "text-emerald-400" : ""
          }`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

// 分数行（自动高亮最高分）
function ScoreRow({
  label,
  values,
  format = "score",
}: {
  label: string;
  values: number[];
  format?: "score" | "int";
}) {
  // 找最大值
  const maxVal = Math.max(...values);
  const hasMultiple = values.length > 1;

  return (
    <tr>
      <td className="sticky left-0 bg-zinc-900 px-4 py-2.5 text-zinc-500 font-medium whitespace-nowrap">
        {label}
      </td>
      {values.map((v, i) => {
        const isMax = hasMultiple && v === maxVal;
        return (
          <td
            key={i}
            className={`px-4 py-2.5 font-semibold ${
              isMax
                ? "text-emerald-400 bg-emerald-500/10"
                : "text-zinc-300"
            }`}
          >
            {format === "int" ? v.toLocaleString() : v.toFixed(1)}
          </td>
        );
      })}
    </tr>
  );
}
