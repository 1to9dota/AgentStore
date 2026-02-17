"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import CapabilityCard from "@/components/CapabilityCard";
import { Capability } from "@/lib/types";

type SortKey = "score" | "stars" | "updated";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "评分" },
  { value: "stars", label: "Stars" },
  { value: "updated", label: "更新时间" },
];

interface CategoryClientProps {
  capabilities: Capability[];
  label: string;
  slug: string;
}

export default function CategoryClient({
  capabilities,
  label,
  slug,
}: CategoryClientProps) {
  const [sortBy, setSortBy] = useState<SortKey>("score");

  const sorted = useMemo(() => {
    const list = [...capabilities];
    switch (sortBy) {
      case "score":
        return list.sort((a, b) => b.overall_score - a.overall_score);
      case "stars":
        return list.sort((a, b) => b.stars - a.stars);
      case "updated":
        return list.sort(
          (a, b) =>
            new Date(b.last_updated).getTime() -
            new Date(a.last_updated).getTime()
        );
      default:
        return list;
    }
  }, [capabilities, sortBy]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* 面包屑 */}
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">
          首页
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{label || slug}</span>
      </nav>

      {/* 标题 + 排序 */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-zinc-100">
            {label || slug}
          </h1>
          <p className="text-zinc-500">
            共 {sorted.length} 个 Agent 能力
          </p>
        </div>
        <div className="shrink-0">
          <label className="mr-2 text-sm text-zinc-500">排序</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 outline-none transition-colors focus:border-blue-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-zinc-500">该分类下暂无数据</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((cap) => (
            <CapabilityCard key={cap.slug} capability={cap} />
          ))}
        </div>
      )}
    </div>
  );
}
