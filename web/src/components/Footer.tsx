import Link from "next/link";

// 底部组件 — 三列布局 + 版权行
export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      {/* 三列链接区 */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* 产品 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              产品
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                  首页
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                  搜索
                </Link>
              </li>
              <li>
                <Link href="/compare" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                  对比
                </Link>
              </li>
              <li>
                <Link href="/stats" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                  数据面板
                </Link>
              </li>
            </ul>
          </div>

          {/* 开发者 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              开发者
            </h3>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://github.com/1to9dota/AgentStore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/1to9dota/AgentStore#api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  API 文档
                </a>
              </li>
            </ul>
          </div>

          {/* 关于 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              关于
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/about" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                  关于 AgentStore
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/1to9dota/AgentStore/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  联系我们
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 底部版权行 */}
      <div className="border-t border-zinc-800/50 px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} AgentStore. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span>Powered by</span>
            <span className="text-blue-500">AI</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
