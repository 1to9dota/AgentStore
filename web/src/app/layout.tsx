import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentStore - Agent 能力注册表",
  description: "发现、评估和信任 AI Agent 能力 — 五维雷达评分，一目了然",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-black text-zinc-100 antialiased`}
      >
        {/* 导航栏 */}
        <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-md">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight transition-colors hover:text-blue-400"
            >
              Agent
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Store
              </span>
            </Link>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <Link
                href="/"
                className="transition-colors hover:text-zinc-200"
              >
                首页
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-zinc-200"
              >
                GitHub
              </a>
            </div>
          </nav>
        </header>

        {/* 页面内容 */}
        <main>{children}</main>

        {/* 页脚 */}
        <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-600">
          <p>AgentStore — Agent 能力注册表 + 信誉系统</p>
        </footer>
      </body>
    </html>
  );
}
