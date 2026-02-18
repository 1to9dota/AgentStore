"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/types";

// ========== 类型定义 ==========

interface CategoryStat {
  category: string;
  label: string;
  count: number;
  avgScore: number;
  topPlugin: { name: string; slug: string; score: number } | null;
}

interface RecentPlugin {
  name: string;
  slug: string;
  category: string;
  score: number;
  source: string;
  lastUpdated: string;
}

interface LowScorePlugin {
  name: string;
  slug: string;
  category: string;
  score: number;
}

interface AdminClientProps {
  totalPlugins: number;
  avgScore: number;
  lastUpdated: string;
  noAiSummary: number;
  noRepoUrl: number;
  zeroScore: number;
  categoryStats: CategoryStat[];
  recentPlugins: RecentPlugin[];
  lowScorePlugins: LowScorePlugin[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

/**
 * 管理后台客户端组件
 * 暗色主题，展示系统概览、数据质量、分类分布、最近插件、低分预警
 */
export default function AdminClient({
  totalPlugins,
  avgScore,
  lastUpdated,
  noAiSummary,
  noRepoUrl,
  zeroScore,
  categoryStats,
  recentPlugins,
  lowScorePlugins,
}: AdminClientProps) {
  // 密码校验状态（初始化时直接从 sessionStorage 读取）
  const [authed, setAuthed] = useState(() =>
    typeof window !== "undefined" && sessionStorage.getItem("admin_authed") === "1"
  );
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // 从 API 获取的动态数据
  const [totalUsers, setTotalUsers] = useState<string>("加载中...");
  const [totalComments, setTotalComments] = useState<string>("加载中...");

  // 客户端加载用户数和评论数（所有 hooks 必须在条件 return 之前）
  useEffect(() => {
    if (!authed) return;
    fetch(`${API_URL}/api/v1/stats/users`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setTotalUsers(String(data.total ?? data.count ?? "N/A")))
      .catch(() => setTotalUsers("N/A"));

    fetch(`${API_URL}/api/v1/stats/comments`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setTotalComments(String(data.total ?? data.count ?? "N/A")))
      .catch(() => setTotalComments("N/A"));
  }, [authed]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/verify`, {
        method: "POST",
        headers: { "X-Admin-Password": password },
      });
      if (res.ok) {
        setAuthed(true);
        sessionStorage.setItem("admin_authed", "1");
      } else {
        setAuthError("密码错误");
      }
    } catch {
      setAuthError("服务器连接失败");
    }
  };

  // 未通过校验时显示密码输入界面
  if (!authed) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <div className="mb-4 text-4xl">🔒</div>
          <h1 className="mb-2 text-xl font-bold text-zinc-100">管理后台</h1>
          <p className="mb-6 text-sm text-zinc-500">请输入管理员密码</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="管理员密码"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
              autoFocus
            />
            {authError && <p className="text-sm text-red-400">{authError}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              进入
            </button>
          </form>
        </div>
      </div>
    );
  }



  // 百分比计算辅助函数
  const pct = (part: number, total: number) =>
    total > 0 ? ((part / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 顶部管理员标识 */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            管理员视图 — 仅供内部使用
          </div>
          <h1 className="text-3xl font-bold text-white">管理后台</h1>
          <p className="text-gray-400 mt-1">AgentStore 数据概览与质量监控</p>
        </div>

        {/* ========== 系统概览卡片（5 个） ========== */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">系统概览</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="总插件数" value={String(totalPlugins)} icon="📦" color="blue" />
            <StatCard label="总用户数" value={totalUsers} icon="👥" color="green" />
            <StatCard label="总评论数" value={totalComments} icon="💬" color="purple" />
            <StatCard label="平均评分" value={avgScore.toFixed(2)} icon="⭐" color="yellow" />
            <StatCard
              label="最后更新"
              value={lastUpdated ? new Date(lastUpdated).toLocaleDateString("zh-CN") : "N/A"}
              icon="🕐"
              color="gray"
            />
          </div>
        </section>

        {/* ========== 数据质量监控 ========== */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">数据质量监控</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QualityCard
              label="无 AI 分析"
              count={noAiSummary}
              total={totalPlugins}
              pct={pct(noAiSummary, totalPlugins)}
              color="orange"
            />
            <QualityCard
              label="无仓库 URL"
              count={noRepoUrl}
              total={totalPlugins}
              pct={pct(noRepoUrl, totalPlugins)}
              color="red"
            />
            <QualityCard
              label="评分为 0"
              count={zeroScore}
              total={totalPlugins}
              pct={pct(zeroScore, totalPlugins)}
              color="yellow"
            />
          </div>
        </section>

        {/* ========== 分类分布表格 ========== */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">分类分布</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="bg-gray-900 text-gray-400 border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-medium">分类</th>
                  <th className="text-right px-4 py-3 font-medium">插件数</th>
                  <th className="text-right px-4 py-3 font-medium">平均分</th>
                  <th className="text-left px-4 py-3 font-medium">最高分插件</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map((cat) => (
                  <tr key={cat.category} className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-gray-200">{cat.label}</span>
                      <span className="text-gray-500 text-xs ml-1">({cat.category})</span>
                    </td>
                    <td className="text-right px-4 py-3 text-gray-300 font-mono">{cat.count}</td>
                    <td className="text-right px-4 py-3">
                      <span className={`font-mono ${cat.avgScore >= 4 ? "text-green-400" : cat.avgScore >= 3 ? "text-yellow-400" : "text-red-400"}`}>
                        {cat.avgScore.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {cat.topPlugin ? (
                        <Link
                          href={`/capability/${cat.topPlugin.slug}`}
                          className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                        >
                          {cat.topPlugin.name}
                          <span className="text-gray-500 text-xs ml-1">({cat.topPlugin.score.toFixed(1)})</span>
                        </Link>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========== 最近添加的 10 个插件 ========== */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">最近添加的插件</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-900 text-gray-400 border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-medium">名称</th>
                  <th className="text-left px-4 py-3 font-medium">分类</th>
                  <th className="text-right px-4 py-3 font-medium">评分</th>
                  <th className="text-left px-4 py-3 font-medium">来源</th>
                  <th className="text-left px-4 py-3 font-medium">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {recentPlugins.map((p) => (
                  <tr key={p.slug} className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/capability/${p.slug}`}
                        className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{CATEGORIES[p.category] || p.category}</td>
                    <td className="text-right px-4 py-3">
                      <ScorePill score={p.score} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        p.source === "mcp"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-green-500/10 text-green-400 border border-green-500/20"
                      }`}>
                        {p.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {new Date(p.lastUpdated).toLocaleDateString("zh-CN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========== 低分预警 ========== */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">
            低分预警
            <span className="text-sm font-normal text-gray-500 ml-2">
              (评分 &lt; 3.0，共 {lowScorePlugins.length} 个)
            </span>
          </h2>
          {lowScorePlugins.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="bg-gray-900 text-gray-400 border-b border-gray-800">
                    <th className="text-left px-4 py-3 font-medium">名称</th>
                    <th className="text-right px-4 py-3 font-medium">评分</th>
                    <th className="text-left px-4 py-3 font-medium">分类</th>
                  </tr>
                </thead>
                <tbody>
                  {lowScorePlugins.map((p) => (
                    <tr key={p.slug} className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/capability/${p.slug}`}
                          className="text-red-400 hover:text-red-300 hover:underline transition-colors"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="text-right px-4 py-3">
                        <ScorePill score={p.score} />
                      </td>
                      <td className="px-4 py-3 text-gray-400">{CATEGORIES[p.category] || p.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-6 py-8 text-center text-gray-500">
              没有低分插件，数据质量良好
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ========== 子组件 ==========

/** 系统概览统计卡片 */
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: "blue" | "green" | "purple" | "yellow" | "gray";
}) {
  const borderColors = {
    blue: "border-blue-500/30",
    green: "border-green-500/30",
    purple: "border-purple-500/30",
    yellow: "border-yellow-500/30",
    gray: "border-gray-700",
  };

  return (
    <div className={`rounded-xl bg-gray-900 border ${borderColors[color]} p-4`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

/** 数据质量监控卡片 */
function QualityCard({
  label,
  count,
  total,
  pct,
  color,
}: {
  label: string;
  count: number;
  total: number;
  pct: string;
  color: "orange" | "red" | "yellow";
}) {
  const bgColors = {
    orange: "bg-orange-500/10 border-orange-500/20",
    red: "bg-red-500/10 border-red-500/20",
    yellow: "bg-yellow-500/10 border-yellow-500/20",
  };
  const textColors = {
    orange: "text-orange-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
  };
  const barColors = {
    orange: "bg-orange-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
  };

  return (
    <div className={`rounded-xl border ${bgColors[color]} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-300 text-sm">{label}</span>
        <span className={`text-lg font-bold font-mono ${textColors[color]}`}>{count}</span>
      </div>
      {/* 进度条 */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full ${barColors[color]} transition-all`}
          style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
        />
      </div>
      <div className="text-xs text-gray-500">
        占比 {pct}%（共 {total} 个）
      </div>
    </div>
  );
}

/** 评分徽章 */
function ScorePill({ score }: { score: number }) {
  const color =
    score >= 4
      ? "bg-green-500/10 text-green-400"
      : score >= 3
        ? "bg-yellow-500/10 text-yellow-400"
        : score > 0
          ? "bg-red-500/10 text-red-400"
          : "bg-gray-800 text-gray-500";

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${color}`}>
      {score > 0 ? score.toFixed(1) : "—"}
    </span>
  );
}
