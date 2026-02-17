import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
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
        <Navbar />

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
