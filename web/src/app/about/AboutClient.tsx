"use client";

import { useLocale } from "@/i18n";

const TECH_STACK_ZH = [
  { layer: "前端", tech: "Next.js 16 + Tailwind CSS" },
  { layer: "后端", tech: "FastAPI + SQLite" },
  { layer: "AI", tech: "OpenAI GPT-4o-mini 评分 + text-embedding-3-small 语义搜索" },
  { layer: "部署", tech: "Vercel + Docker" },
];

const TECH_STACK_EN = [
  { layer: "Frontend", tech: "Next.js 16 + Tailwind CSS" },
  { layer: "Backend", tech: "FastAPI + SQLite" },
  { layer: "AI", tech: "OpenAI GPT-4o-mini scoring + text-embedding-3-small search" },
  { layer: "Deploy", tech: "Vercel + Docker" },
];

const FEATURES_ZH = [
  {
    title: "五维评分系统",
    desc: "可靠性 / 安全性 / 能力 / 声誉 / 易用性，AI 驱动的多维度量化评估",
  },
  {
    title: "语义搜索",
    desc: "跨语言理解查询意图，用自然语言描述需求即可精准匹配插件",
  },
  {
    title: "安全扫描",
    desc: "代码漏洞 + 依赖漏洞 + 密钥泄露检测，全方位安全审计",
  },
  {
    title: "插件对比",
    desc: "最多 4 个插件横向对比，维度齐全，一目了然选出最优方案",
  },
];

const FEATURES_EN = [
  {
    title: "5D Rating System",
    desc: "Reliability / Security / Capability / Reputation / Usability — AI-driven multi-dimensional scoring",
  },
  {
    title: "Semantic Search",
    desc: "Cross-language intent understanding — describe your needs in natural language to find the right plugin",
  },
  {
    title: "Security Scan",
    desc: "Code vulnerabilities + dependency audits + secret leak detection — comprehensive security analysis",
  },
  {
    title: "Plugin Compare",
    desc: "Side-by-side comparison of up to 4 plugins across all dimensions — make the best choice at a glance",
  },
];

const FEATURE_ICONS = [
  <svg key="star" className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>,
  <svg key="search" className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>,
  <svg key="shield" className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>,
  <svg key="compare" className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>,
];

export default function AboutClient() {
  const { locale } = useLocale();
  const isZh = locale === "zh";

  const TECH_STACK = isZh ? TECH_STACK_ZH : TECH_STACK_EN;
  const FEATURES = isZh ? FEATURES_ZH : FEATURES_EN;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      {/* Hero */}
      <section className="mb-20 text-center">
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight">
          Agent
          <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Store
          </span>
        </h1>
        <p className="mb-6 text-xl font-medium text-zinc-300">
          {isZh ? "AI Agent 能力的 DNS + 信用评级" : "DNS + Credit Rating for AI Agent Capabilities"}
        </p>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400">
          {isZh
            ? "帮助开发者发现、评估和比较 MCP 插件。通过 AI 驱动的多维度评分体系和语义搜索，让你在数百个插件中快速找到最适合的 Agent 能力。"
            : "Discover, evaluate, and compare MCP plugins. With AI-driven multi-dimensional scoring and semantic search, find the best Agent capability from hundreds of plugins instantly."}
        </p>
      </section>

      {/* Core Features */}
      <section className="mb-20">
        <h2 className="mb-10 text-center text-2xl font-bold">
          {isZh ? "核心功能" : "Core Features"}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="mb-4 text-blue-400">{FEATURE_ICONS[i]}</div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-20">
        <h2 className="mb-10 text-center text-2xl font-bold">
          {isZh ? "技术架构" : "Tech Stack"}
        </h2>
        <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-zinc-800">
          {TECH_STACK.map((item, i) => (
            <div
              key={item.layer}
              className={`flex items-center gap-4 px-6 py-4 ${
                i !== TECH_STACK.length - 1 ? "border-b border-zinc-800" : ""
              }`}
            >
              <span className="w-20 shrink-0 text-sm font-semibold text-blue-400">
                {item.layer}
              </span>
              <span className="text-sm text-zinc-300">{item.tech}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Open Source */}
      <section className="mb-20">
        <h2 className="mb-10 text-center text-2xl font-bold">
          {isZh ? "开源" : "Open Source"}
        </h2>
        <div className="mx-auto max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <p className="mb-2 text-sm text-zinc-400">License</p>
          <p className="mb-6 text-lg font-semibold">MIT</p>
          <a
            href="https://github.com/1to9dota/AgentStore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            {isZh ? "GitHub 仓库" : "GitHub Repo"}
          </a>
          <p className="mt-6 text-sm text-zinc-500">
            {isZh
              ? "欢迎提交 Issue 和 Pull Request，一起让 AgentStore 变得更好。"
              : "Contributions welcome via Issues and Pull Requests."}
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="text-center">
        <h2 className="mb-6 text-2xl font-bold">
          {isZh ? "联系我们" : "Contact Us"}
        </h2>
        <p className="mb-4 text-sm text-zinc-400">
          {isZh
            ? "有问题、建议或想参与贡献？欢迎通过 GitHub Issues 联系。"
            : "Have questions or want to contribute? Reach out via GitHub Issues."}
        </p>
        <a
          href="https://github.com/1to9dota/AgentStore/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          {isZh ? "前往 GitHub Issues" : "Open a GitHub Issue"}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </section>
    </main>
  );
}
