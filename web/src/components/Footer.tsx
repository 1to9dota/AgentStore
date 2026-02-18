"use client";

import Link from "next/link";
import { useLocale } from "@/i18n";

export default function Footer() {
  const { locale } = useLocale();
  const isZh = locale === "zh";

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 pb-16 md:pb-0">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {isZh ? "产品" : "Product"}
            </h3>
            <ul className="space-y-2.5">
              <li><Link href="/" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">{isZh ? "首页" : "Home"}</Link></li>
              <li><Link href="/search" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">{isZh ? "搜索" : "Search"}</Link></li>
              <li><Link href="/compare" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">{isZh ? "对比" : "Compare"}</Link></li>
              <li><Link href="/stats" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">{isZh ? "数据面板" : "Dashboard"}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {isZh ? "开发者" : "Developers"}
            </h3>
            <ul className="space-y-2.5">
              <li>
                <a href="https://github.com/1to9dota/AgentStore" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://github.com/1to9dota/AgentStore#api" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                  {isZh ? "API 文档" : "API Docs"}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {isZh ? "关于" : "About"}
            </h3>
            <ul className="space-y-2.5">
              <li><Link href="/about" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">{isZh ? "关于 AgentStore" : "About AgentStore"}</Link></li>
              <li>
                <a href="https://github.com/1to9dota/AgentStore/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                  {isZh ? "联系我们" : "Contact Us"}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800/50 px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-zinc-600">&copy; {new Date().getFullYear()} AgentStore. All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span>Powered by</span>
            <span className="text-blue-500">AI</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
