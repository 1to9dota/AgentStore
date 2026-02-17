"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import CapabilityCard from "@/components/CapabilityCard";
import { Capability } from "@/lib/types";

function SearchResultsInner({
  capabilities,
}: {
  capabilities: Capability[];
}) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return capabilities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.one_liner.toLowerCase().includes(q) ||
        c.provider.toLowerCase().includes(q)
    );
  }, [query, capabilities]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* 面包屑 */}
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">
          首页
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">搜索</span>
      </nav>

      <h1 className="mb-2 text-3xl font-bold text-zinc-100">搜索结果</h1>
      {query.trim() ? (
        <p className="mb-8 text-zinc-500">
          关键词 &quot;{query}&quot; 共找到 {results.length} 个结果
        </p>
      ) : (
        <p className="mb-8 text-zinc-500">请输入搜索关键词</p>
      )}

      {query.trim() && results.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-zinc-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <p className="text-lg text-zinc-400 mb-2">
            没有找到与 &quot;{query}&quot; 匹配的 Agent 能力
          </p>
          <p className="text-sm text-zinc-600">
            试试其他关键词，或者
            <Link href="/" className="text-blue-400 hover:text-blue-300 ml-1">
              回到首页浏览
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((cap) => (
            <CapabilityCard key={cap.slug} capability={cap} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchClient({
  capabilities,
}: {
  capabilities: Capability[];
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-zinc-500">加载中...</p>
        </div>
      }
    >
      <SearchResultsInner capabilities={capabilities} />
    </Suspense>
  );
}
