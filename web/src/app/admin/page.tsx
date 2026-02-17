import type { Metadata } from "next";
import { getAllCapabilities, getCategories } from "@/lib/data";
import { CATEGORIES } from "@/lib/types";
import AdminClient from "./AdminClient";

// 页面元数据
export const metadata: Metadata = {
  title: "管理后台 - AgentStore",
  robots: { index: false, follow: false },
};

/**
 * 管理后台页面（服务端）
 * 在服务端完成数据统计，传给客户端组件渲染
 */
export default function AdminPage() {
  const capabilities = getAllCapabilities();
  const categories = getCategories();

  // ========== 服务端统计 ==========

  // 基础统计
  const totalPlugins = capabilities.length;
  const avgScore =
    totalPlugins > 0
      ? capabilities.reduce((sum, c) => sum + c.overall_score, 0) / totalPlugins
      : 0;

  // 最后更新时间：取所有插件的 last_updated 最新值
  const lastUpdated = capabilities.reduce((latest, c) => {
    return c.last_updated > latest ? c.last_updated : latest;
  }, "");

  // 数据质量统计
  const noAiSummary = capabilities.filter((c) => !c.ai_summary).length;
  const noRepoUrl = capabilities.filter((c) => !c.repo_url).length;
  const zeroScore = capabilities.filter((c) => c.overall_score === 0).length;

  // 分类分布
  const categoryStats = categories.map((cat) => {
    const items = capabilities.filter((c) => c.category === cat);
    const avg =
      items.length > 0
        ? items.reduce((s, c) => s + c.overall_score, 0) / items.length
        : 0;
    const topItem = items.reduce(
      (best, c) => (c.overall_score > best.overall_score ? c : best),
      items[0]
    );
    return {
      category: cat,
      label: CATEGORIES[cat] || cat,
      count: items.length,
      avgScore: avg,
      topPlugin: topItem ? { name: topItem.name, slug: topItem.slug, score: topItem.overall_score } : null,
    };
  });

  // 最近添加的 10 个插件（按 last_updated 降序）
  const recentPlugins = [...capabilities]
    .sort((a, b) => b.last_updated.localeCompare(a.last_updated))
    .slice(0, 10)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      category: c.category,
      score: c.overall_score,
      source: c.source,
      lastUpdated: c.last_updated,
    }));

  // 低分预警（评分 < 3）
  const lowScorePlugins = capabilities
    .filter((c) => c.overall_score > 0 && c.overall_score < 3)
    .sort((a, b) => a.overall_score - b.overall_score)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      category: c.category,
      score: c.overall_score,
    }));

  return (
    <AdminClient
      totalPlugins={totalPlugins}
      avgScore={avgScore}
      lastUpdated={lastUpdated}
      noAiSummary={noAiSummary}
      noRepoUrl={noRepoUrl}
      zeroScore={zeroScore}
      categoryStats={categoryStats}
      recentPlugins={recentPlugins}
      lowScorePlugins={lowScorePlugins}
    />
  );
}
