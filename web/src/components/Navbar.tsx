"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const handleSearch = () => {
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setQuery("");
      setMenuOpen(false);
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

        {/* 桌面端：搜索框 + 链接 */}
        <div className="hidden items-center gap-4 md:flex">
          {/* 导航搜索框 */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="搜索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-48 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:w-64 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
              aria-label="搜索"
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
            首页
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            GitHub
          </a>
        </div>

        {/* 移动端：汉堡菜单按钮 */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 md:hidden"
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
      </nav>

      {/* 移动端展开菜单 */}
      {menuOpen && (
        <div className="border-t border-zinc-800 px-6 py-4 md:hidden">
          {/* 移动端搜索框 */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="text"
              placeholder="搜索 Agent 能力..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-500"
            >
              搜索
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              首页
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
              GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
