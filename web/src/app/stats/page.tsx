import { getAllCapabilities } from "@/lib/data";
import { Capability, CATEGORIES } from "@/lib/types";
import StatsClient from "./StatsClient";

// ==================== 工具函数 ====================

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

// ==================== 页面主体 ====================
export default function StatsPage() {
  const capabilities = getAllCapabilities();
  const total = capabilities.length;

  const avgScore =
    total > 0
      ? (capabilities.reduce((s, c) => s + c.overall_score, 0) / total).toFixed(1)
      : "0";
  const categoryCount = new Set(capabilities.map((c) => c.category)).size;
  const hasTestsCount = capabilities.filter((c) => c.has_tests).length;
  const hasTestsPercent = total > 0 ? Math.round((hasTestsCount / total) * 100) : 0;

  const categoryDist = getCategoryDistribution(capabilities);
  const scoreDist = getScoreDistribution(capabilities);
  const langDist = getLanguageDistribution(capabilities);

  const top10 = [...capabilities].sort((a, b) => b.overall_score - a.overall_score).slice(0, 10);
  const recent10 = [...capabilities]
    .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
    .slice(0, 10);

  return (
    <StatsClient
      total={total}
      avgScore={avgScore}
      categoryCount={categoryCount}
      hasTestsCount={hasTestsCount}
      hasTestsPercent={hasTestsPercent}
      categoryDist={categoryDist}
      scoreDist={scoreDist}
      langDist={langDist}
      top10={top10}
      recent10={recent10}
    />
  );
}
