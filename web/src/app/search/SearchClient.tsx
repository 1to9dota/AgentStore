"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import CapabilityCard from "@/components/CapabilityCard";
import { useDebounce } from "@/hooks/useDebounce";
import { Capability, CATEGORIES } from "@/lib/types";
import { useLocale } from "@/i18n";

/** 每次"加载更多"显示的条数 */
const PAGE_SIZE = 20;

/** 排序选项 */
type SortKey = "score" | "stars" | "updated";

/** 热门搜索标签（高频分类 + 关键词） */
const HOT_TAGS = [
  "database",
  "search",
  "file",
  "git",
  "browser",
  "AI",
  "Claude",
  "API",
  "Docker",
  "Slack",
];

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
  const { t, locale } = useLocale();
  const isZh = locale === "zh";

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "score", label: isZh ? "评分最高" : "Top Rated" },
    { key: "stars", label: isZh ? "Stars 最多" : "Most Stars" },
    { key: "updated", label: isZh ? "最近更新" : "Recently Updated" },
  ];

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

  // 排序
  const [sortKey, setSortKey] = useState<SortKey>("score");

  // 分类筛选
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // 输入框是否聚焦（控制热门标签显示）
  const [isFocused, setIsFocused] = useState(false);

  // 搜索过滤逻辑
  const filteredResults = useMemo(() => {
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

  // 搜索结果中出现的分类（用于筛选 chips）
  const resultCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of filteredResults) {
      counts.set(c.category, (counts.get(c.category) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [filteredResults]);

  // 分类过滤
  const categoryFiltered = useMemo(() => {
    if (!activeCategory) return filteredResults;
    return filteredResults.filter((c) => c.category === activeCategory);
  }, [filteredResults, activeCategory]);

  // 排序
  const results = useMemo(() => {
    const sorted = [...categoryFiltered];
    switch (sortKey) {
      case "score":
        sorted.sort((a, b) => b.overall_score - a.overall_score);
        break;
      case "stars":
        sorted.sort((a, b) => b.stars - a.stars);
        break;
      case "updated":
        sorted.sort(
          (a, b) =>
            new Date(b.last_updated).getTime() -
            new Date(a.last_updated).getTime()
        );
        break;
    }
    return sorted;
  }, [categoryFiltered, sortKey]);

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

  // 输入变化时更新本地状态，并重置分页和筛选
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalQuery(e.target.value);
      setVisibleCount(PAGE_SIZE);
      setActiveCategory(null);
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

  // 点击热门标签
  const handleTagClick = useCallback(
    (tag: string) => {
      setLocalQuery(tag);
      setVisibleCount(PAGE_SIZE);
      setActiveCategory(null);
      router.push(`/search?q=${encodeURIComponent(tag)}`);
    },
    [router]
  );

  // 是否显示热门标签：聚焦且无搜索词
  const showHotTags = isFocused && !localQuery.trim();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* 面包屑 */}
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">
          {t.nav.home}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{t.nav.search}</span>
      </nav>

      <h1 className="mb-4 text-3xl font-bold text-zinc-100">{t.search_page.title}</h1>

      {/* 实时搜索输入框 */}
      <div className="relative mb-2">
        <input
          type="text"
          value={localQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // 延迟关闭，让点击事件先触发
            setTimeout(() => setIsFocused(false), 200);
          }}
          placeholder={t.home.search_placeholder}
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

      {/* 热门搜索标签 */}
      {showHotTags && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-xs text-zinc-500 self-center mr-1">{t.search_page.hot_tags}</span>
          {HOT_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className="rounded-full border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400"
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* 排序 + 分类筛选（有搜索结果时显示） */}
      {debouncedQuery.trim() && filteredResults.length > 0 && (
        <div className="mb-6 space-y-3">
          {/* 排序选项 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 shrink-0">{t.search_page.sort}</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => {
                  setSortKey(opt.key);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`rounded-lg px-3 py-1 text-xs transition-colors ${
                  sortKey === opt.key
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 分类筛选 chips */}
          {resultCategories.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-500 shrink-0">{t.search_page.category}</span>
              <button
                onClick={() => {
                  setActiveCategory(null);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`rounded-lg px-3 py-1 text-xs transition-colors ${
                  activeCategory === null
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
                }`}
              >
                {t.search_page.all} ({filteredResults.length})
              </button>
              {resultCategories.map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(activeCategory === cat ? null : cat);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`rounded-lg px-3 py-1 text-xs transition-colors ${
                    activeCategory === cat
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {CATEGORIES[cat] || cat} ({count})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 结果统计 */}
      {debouncedQuery.trim() ? (
        <p className="mb-8 text-zinc-500">
          {isZh
            ? <>关键词 &quot;{debouncedQuery}&quot; 共找到 {results.length} 个结果
                {hasMore && <span className="ml-2 text-zinc-600">（当前显示 {visibleResults.length} 条）</span>}
              </>
            : <>{results.length} result{results.length !== 1 ? "s" : ""} for &quot;{debouncedQuery}&quot;
                {hasMore && <span className="ml-2 text-zinc-600">(showing {visibleResults.length})</span>}
              </>
          }
        </p>
      ) : (
        !showHotTags && <p className="mb-8 text-zinc-500">{t.search_page.enter_keyword}</p>
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
            {isZh
              ? <>没有找到与 &quot;{debouncedQuery}&quot; 匹配的 MCP 插件</>
              : <>No results for &quot;{debouncedQuery}&quot;</>
            }
          </p>
          <p className="text-sm text-zinc-600">
            {t.search_page.try_another}
            <Link href="/" className="text-blue-400 hover:text-blue-300 ml-1">
              {t.search_page.back_home}
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
                {isZh
                  ? `${t.search_page.load_more}（还有 ${results.length - visibleCount} 条）`
                  : `${t.search_page.load_more} (${results.length - visibleCount} more)`
                }
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
