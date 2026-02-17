"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import CapabilityCard from "@/components/CapabilityCard";
import { Capability, CATEGORIES } from "@/lib/types";

interface HomeClientProps {
  capabilities: Capability[];
}

export default function HomeClient({ capabilities }: HomeClientProps) {
  const [query, setQuery] = useState("");

  // 客户端搜索过滤
  const filtered = useMemo(() => {
    if (!query.trim()) return capabilities;
    const q = query.toLowerCase();
    return capabilities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.one_liner.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [query, capabilities]);

  // 按分数排序的 Top 列表
  const topCapabilities = useMemo(
    () => [...capabilities].sort((a, b) => b.overall_score - a.overall_score),
    [capabilities]
  );

  // 获取有数据的分类
  const activeCategories = useMemo(() => {
    const cats = new Set(capabilities.map((c) => c.category));
    return Object.entries(CATEGORIES).filter(([key]) => cats.has(key));
  }, [capabilities]);

  const displayList = query.trim() ? filtered : topCapabilities;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-black px-6 py-20 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-100 sm:text-6xl">
            Agent
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Store
            </span>
          </h1>
          <p className="mt-4 text-lg text-zinc-400">
            Agent 能力注册表 + 信誉系统
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            发现、评估和信任 AI Agent 能力 -- 五维雷达评分，一目了然
          </p>

          {/* 搜索栏 */}
          <div className="mt-8">
            <input
              type="text"
              placeholder="搜索 Agent 能力..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-800/80 px-5 py-3 text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* 搜索结果或 Top 列表 */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="mb-6 text-xl font-semibold text-zinc-200">
          {query.trim()
            ? `搜索结果 (${filtered.length})`
            : "Top Agent 能力"}
        </h2>

        {displayList.length === 0 ? (
          <p className="text-zinc-500">没有找到匹配的结果</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayList.map((cap) => (
              <CapabilityCard key={cap.slug} capability={cap} />
            ))}
          </div>
        )}
      </section>

      {/* 分类导航 */}
      {!query.trim() && activeCategories.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-16">
          <h2 className="mb-6 text-xl font-semibold text-zinc-200">
            按分类浏览
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {activeCategories.map(([key, label]) => {
              const count = capabilities.filter(
                (c) => c.category === key
              ).length;
              return (
                <Link
                  key={key}
                  href={`/category/${key}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition-all hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <span className="text-zinc-300">{label}</span>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
