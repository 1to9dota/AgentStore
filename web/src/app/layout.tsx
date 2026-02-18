import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ClientProviders from "@/components/ClientProviders";
import Navbar from "@/components/Navbar";
import ScrollToTop from "@/components/ScrollToTop";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 站点基础 URL
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://agentstore.dev";

export const metadata: Metadata = {
  // 标题模板：子页面自动拼接后缀
  title: {
    default: "AgentStore - MCP 插件评级平台",
    template: "%s | AgentStore - MCP 插件评级平台",
  },
  description:
    "发现、评估和比较 200+ MCP 插件，AI 驱动的五维评分系统，帮助开发者选择最合适的 Agent 能力",
  // 规范链接
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
  },
  // Open Graph 配置
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: BASE_URL,
    siteName: "AgentStore",
    title: "AgentStore - MCP 插件评级平台",
    description:
      "发现、评估和比较 200+ MCP 插件，AI 驱动的五维评分系统",
  },
  // Twitter Card 配置
  twitter: {
    card: "summary_large_image",
    title: "AgentStore - MCP 插件评级平台",
    description:
      "发现、评估和比较 200+ MCP 插件，AI 驱动的五维评分系统",
  },
  // PWA 支持
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  icons: { icon: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  // 其他 SEO 相关
  keywords: [
    "MCP",
    "插件",
    "Agent",
    "AI",
    "评分",
    "评级",
    "Model Context Protocol",
    "Claude",
    "LLM",
    "开发者工具",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

// Organization 结构化数据（JSON-LD）
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AgentStore",
  url: BASE_URL,
  description:
    "MCP 插件评级平台 — 发现、评估和比较 200+ MCP 插件",
  logo: `${BASE_URL}/favicon.ico`,
};

// WebSite 结构化数据，支持站内搜索
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "AgentStore",
  url: BASE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${BASE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        {/* DNS 预解析：加速 API 请求 */}
        <link rel="dns-prefetch" href="//api.agentstore.dev" />
        <link rel="preconnect" href="https://api.agentstore.dev" crossOrigin="anonymous" />

        {/* 结构化数据 JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-black pb-16 text-zinc-100 antialiased md:pb-0`}
      >
        <ClientProviders>
          {/* 导航栏 */}
          <Navbar />

          {/* 页面内容 */}
          <main className="animate-fade-in">{children}</main>

          {/* 页脚 */}
          <Footer />

          {/* 回到顶部按钮 */}
          <ScrollToTop />

          {/* 移动端底部导航栏 */}
          <MobileNav />
        </ClientProviders>
      </body>
    </html>
  );
}
