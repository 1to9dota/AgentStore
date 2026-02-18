"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n";
import LanguageSwitch from "./LanguageSwitch";
import UserMenu from "./UserMenu";

export default function Navbar() {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t } = useLocale();

  // 移动端搜索框展开时自动聚焦
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchRef.current) {
      mobileSearchRef.current.focus();
    }
  }, [mobileSearchOpen]);

  // ESC 键关闭移动端搜索
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setMobileSearchOpen(false);
        setQuery("");
        return;
      }
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query]
  );

  const handleSearch = () => {
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setQuery("");
      setMenuOpen(false);
      setMobileSearchOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight transition-colors hover:text-blue-400"
        >
          Agent
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Store
          </span>
        </Link>

        {/* 桌面端：搜索框 + 链接 + 语言切换 */}
        <div className="hidden items-center gap-4 md:flex">
          {/* 导航搜索框 */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder={t.home.search_placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-48 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:w-64 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
              aria-label={t.nav.search}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </button>
          </div>

          <Link
            href="/"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            {t.nav.home}
          </Link>
          <Link
            href="/stats"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            {t.nav.stats}
          </Link>
          <Link
            href="/compare"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            对比
          </Link>
          <Link
            href="/about"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            关于
          </Link>
          <a
            href="https://github.com/1to9dota/AgentStore"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            GitHub
          </a>

          {/* 语言切换按钮 */}
          <LanguageSwitch />

          {/* 用户菜单 */}
          <UserMenu />
        </div>

        {/* 移动端：搜索 + 汉堡菜单 */}
        <div className="flex items-center gap-1 md:hidden">
          {/* 移动端搜索图标按钮 */}
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="搜索"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>

          {/* 汉堡菜单按钮 */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="菜单"
          >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
          </button>
        </div>

        {/* 移动端搜索 overlay — 全屏展开 */}
        {mobileSearchOpen && (
          <div className="absolute inset-0 z-50 flex items-center gap-2 bg-black/95 px-4 backdrop-blur-md md:hidden">
            <svg className="h-5 w-5 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              ref={mobileSearchRef}
              type="text"
              placeholder={t.home.search_placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="min-h-[44px] flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
            />
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setQuery("");
              }}
              className="min-h-[44px] shrink-0 px-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              取消
            </button>
          </div>
        )}
      </nav>

      {/* 移动端展开菜单 */}
      {menuOpen && (
        <div className="border-t border-zinc-800 px-6 py-4 md:hidden">
          {/* 移动端搜索框 */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="text"
              placeholder={t.home.search_placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-500"
            >
              {t.nav.search}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              {t.nav.home}
            </Link>
            <Link
              href="/stats"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              {t.nav.stats}
            </Link>
            <Link
              href="/compare"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              对比
            </Link>
            <Link
              href="/about"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              关于
            </Link>
            <a
              href="https://github.com/1to9dota/AgentStore"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              GitHub
            </a>
            {/* 移动端语言切换 + 用户菜单 */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <LanguageSwitch />
              <UserMenu />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
