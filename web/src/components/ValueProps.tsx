"use client";

import Link from "next/link";
import { useLocale } from "@/i18n";

/**
 * 首页卖点卡片 + CTA 横幅
 * 3 个价值主张 + 注册引导，支持中英双语
 */

const VALUE_ITEMS = {
  zh: [
    {
      title: "AI 五维评分",
      desc: "GPT-4o 驱动的可靠性、安全性、能力、口碑、易用性全方位分析",
    },
    {
      title: "安全审查",
      desc: "自动扫描代码仓库，检测潜在安全风险，给出安全性评级",
    },
    {
      title: "横向对比",
      desc: "把多个插件放在一起比，雷达图一目了然谁强谁弱",
    },
  ],
  en: [
    {
      title: "AI 5-Dimension Scoring",
      desc: "GPT-4o powered analysis across reliability, security, capability, reputation & usability",
    },
    {
      title: "Security Scanning",
      desc: "Automated repo scanning for vulnerabilities with a safety rating you can trust",
    },
    {
      title: "Side-by-Side Compare",
      desc: "Compare up to 4 plugins on a radar chart — instantly see who wins where",
    },
  ],
};

const ICONS = [
  // AI 评分图标
  <svg key="ai" className="h-8 w-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
  </svg>,
  // 安全图标
  <svg key="security" className="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>,
  // 对比图标
  <svg key="compare" className="h-8 w-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>,
];

export function ValuePropsSection() {
  const { locale } = useLocale();
  const items = VALUE_ITEMS[locale] ?? VALUE_ITEMS.en;

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <div className="grid gap-6 sm:grid-cols-3">
        {items.map((item, i) => (
          <div
            key={item.title}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center transition-all hover:border-zinc-700 hover:bg-zinc-900"
          >
            <div className="mb-3 flex justify-center">{ICONS[i]}</div>
            <h3 className="text-base font-semibold text-zinc-200">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CTABanner() {
  const { locale } = useLocale();

  return (
    <section className="mx-auto max-w-5xl px-6 pb-12">
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 p-8 text-center">
        <h2 className="text-xl font-bold text-zinc-100">
          {locale === "zh" ? "开始使用 AgentStore" : "Start Using AgentStore"}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {locale === "zh"
            ? "注册免费获取 API Key，将插件评分数据集成到你的工作流"
            : "Sign up free to get an API Key and integrate plugin scoring into your workflow"}
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Link
            href="/search"
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            {locale === "zh" ? "浏览插件" : "Browse Plugins"}
          </Link>
          <Link
            href="/about"
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700"
          >
            {locale === "zh" ? "了解更多" : "Learn More"}
          </Link>
        </div>
      </div>
    </section>
  );
}
