"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import CapabilityCard from "@/components/CapabilityCard";
import { useDebounce } from "@/hooks/useDebounce";
import { Capability } from "@/lib/types";

/** 每次"加载更多"显示的条数 */
const PAGE_SIZE = 20;

/**
 * 搜索结果的内部组件
 * 使用 useSearchParams 需要在 Suspense 内部
 */
function SearchResultsInner({
  capabilities,
}: {
  capabilities: Capability[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL 中的初始查询词
  const urlQuery = searchParams.get("q") || "";

  // 本地输入状态（实时输入）
  const [localQuery, setLocalQuery] = useState(urlQuery);

  // 防抖后的搜索词，300ms 延迟
  const debouncedQuery = useDebounce(localQuery, 300);

  // 是否正在等待防抖（输入值和防抖值不一致 = 还在等）
  const isSearching = localQuery !== debouncedQuery;

  // "加载更多"分页：当前显示的条数上限
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // 搜索过滤逻辑
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return capabilities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.one_liner.toLowerCase().includes(q) ||
        c.provider.toLowerCase().includes(q)
    );
  }, [debouncedQuery, capabilities]);

  // 当前实际显示的结果（分页截断）
  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  );

  // 是否还有更多结果可加载
  const hasMore = visibleCount < results.length;

  // 加载更多
  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  // 输入变化时更新本地状态，并重置分页
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalQuery(e.target.value);
      setVisibleCount(PAGE_SIZE); // 新搜索重置分页
    },
    []
  );

  // 按回车时立即跳转（更新 URL）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && localQuery.trim()) {
        router.push(`/search?q=${encodeURIComponent(localQuery.trim())}`);
      }
    },
    [localQuery, router]
  );

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

      <h1 className="mb-4 text-3xl font-bold text-zinc-100">搜索结果</h1>

      {/* 实时搜索输入框 */}
      <div className="relative mb-6">
        <input
          type="text"
          value={localQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="输入关键词搜索 Agent 能力..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-5 py-3 pr-12 text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
        {/* 搜索中 loading 指示器 */}
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-500" />
          </div>
        )}
      </div>

      {/* 结果统计 */}
      {debouncedQuery.trim() ? (
        <p className="mb-8 text-zinc-500">
          关键词 &quot;{debouncedQuery}&quot; 共找到 {results.length} 个结果
          {hasMore && (
            <span className="ml-2 text-zinc-600">
              （当前显示 {visibleResults.length} 条）
            </span>
          )}
        </p>
      ) : (
        <p className="mb-8 text-zinc-500">请输入搜索关键词</p>
      )}

      {/* 搜索结果列表 */}
      {debouncedQuery.trim() && results.length === 0 && !isSearching ? (
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
            没有找到与 &quot;{debouncedQuery}&quot; 匹配的 Agent 能力
          </p>
          <p className="text-sm text-zinc-600">
            试试其他关键词，或者
            <Link href="/" className="text-blue-400 hover:text-blue-300 ml-1">
              回到首页浏览
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleResults.map((cap) => (
              <CapabilityCard
                key={cap.slug}
                capability={cap}
                highlightQuery={debouncedQuery}
              />
            ))}
          </div>

          {/* "加载更多"按钮 */}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-zinc-100"
              >
                加载更多（还有 {results.length - visibleCount} 条）
              </button>
            </div>
          )}
        </>
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
          {/* 骨架屏 loading */}
          <div className="mb-6 h-4 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="mb-4 h-9 w-48 animate-pulse rounded bg-zinc-800" />
          <div className="mb-6 h-12 w-full animate-pulse rounded-xl bg-zinc-800" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-xl bg-zinc-800/50"
              />
            ))}
          </div>
        </div>
      }
    >
      <SearchResultsInner capabilities={capabilities} />
    </Suspense>
  );
}
