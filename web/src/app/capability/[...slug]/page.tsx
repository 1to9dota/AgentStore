import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  getAllCapabilities,
  getCapabilityBySlug,
} from "@/lib/data";
import { CATEGORIES, SCORE_LABELS, CapabilityScores } from "@/lib/types";
import RadarChart from "@/components/RadarChart";
import ScoreBadge from "@/components/ScoreBadge";
import FavoriteButton from "@/components/FavoriteButton";
import CompareButton from "@/components/CompareButton";
import CommentSection from "@/components/CommentSection";

// SSG: 预生成所有详情页（slug 含 / 需拆为数组）
export function generateStaticParams() {
  return getAllCapabilities().map((c) => ({ slug: c.slug.split("/") }));
}

// 动态 metadata：包含 OG 和 canonical
export function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  return params.then(({ slug }) => {
    const fullSlug = slug.join("/");
    const cap = getCapabilityBySlug(fullSlug);
    if (!cap) return { title: "Not Found" };
    return {
      title: `${cap.name} - AgentStore`,
      description: cap.one_liner,
      alternates: {
        canonical: `/capability/${fullSlug}`,
      },
      openGraph: {
        title: `${cap.name} - AgentStore`,
        description: cap.one_liner,
        type: "article",
      },
    };
  });
}

// 分数条组件
function ScoreBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const pct = (score / 10) * 100;
  const color =
    score >= 7
      ? "bg-emerald-500"
      : score >= 5
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm text-zinc-400">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-zinc-300">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export default async function CapabilityDetailPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const fullSlug = slug.join("/");
  const cap = getCapabilityBySlug(fullSlug);
  if (!cap) notFound();

  const dimensions = Object.keys(SCORE_LABELS) as (keyof CapabilityScores)[];

  // SoftwareApplication 结构化数据（JSON-LD）
  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: cap.name,
    description: cap.description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    ...(cap.repo_url && { url: cap.repo_url }),
    ...(cap.language && { programmingLanguage: cap.language }),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: cap.overall_score.toFixed(1),
      bestRating: "10",
      worstRating: "0",
      ratingCount: cap.contributors || 1,
    },
    author: {
      "@type": "Organization",
      name: cap.provider,
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareJsonLd),
        }}
      />
      {/* 面包屑 */}
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">
          首页
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/category/${cap.category}`}
          className="hover:text-zinc-300 transition-colors"
        >
          {CATEGORIES[cap.category] || cap.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{cap.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* 左侧主内容 */}
        <div className="lg:col-span-2 space-y-8">
          {/* 头部信息 */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-zinc-100">{cap.name}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  cap.source === "mcp"
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {cap.source.toUpperCase()}
              </span>
              <ScoreBadge score={cap.overall_score} label="总分" size="lg" />
              <FavoriteButton slug={fullSlug} />
              <CompareButton slug={fullSlug} />
            </div>
            <p className="mt-3 text-zinc-400 leading-relaxed">
              {cap.description}
            </p>
          </div>

          {/* 雷达图 + 分数条 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-200">
              五维评分
            </h2>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <RadarChart scores={cap.scores} size={260} />
              <div className="flex-1 w-full space-y-3">
                {dimensions.map((dim) => (
                  <ScoreBar
                    key={dim}
                    label={SCORE_LABELS[dim]}
                    score={cap.scores[dim]}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* AI 分析 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-3 text-lg font-semibold text-zinc-200">
              AI 分析
            </h2>
            <p className="text-zinc-400 leading-relaxed">{cap.ai_summary}</p>
          </div>

          {/* 安装指南 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-3 text-lg font-semibold text-zinc-200">
              安装指南
            </h2>
            <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-950 prose-pre:rounded-lg prose-code:text-emerald-400">
              <ReactMarkdown>{cap.install_guide}</ReactMarkdown>
            </div>
          </div>

          {/* 使用方法 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-3 text-lg font-semibold text-zinc-200">
              使用方法
            </h2>
            <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-950 prose-pre:rounded-lg prose-code:text-emerald-400">
              <ReactMarkdown>{cap.usage_guide}</ReactMarkdown>
            </div>
          </div>

          {/* 安全注意事项 */}
          {cap.safety_notes && (
            <div
              className={`rounded-xl border p-6 ${
                cap.scores.safety < 7
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-emerald-500/30 bg-emerald-500/5"
              }`}
            >
              <h2 className="mb-3 text-lg font-semibold text-zinc-200">
                {cap.scores.safety < 7 ? "⚠ 安全提示" : "安全说明"}
              </h2>
              <p className="text-zinc-400 leading-relaxed">
                {cap.safety_notes}
              </p>
            </div>
          )}

          {/* 用户评论区 */}
          <CommentSection slug={fullSlug} />
        </div>

        {/* 右侧边栏 */}
        <aside className="space-y-6">
          {/* GitHub 信息卡 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              项目信息
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">提供者</dt>
                <dd className="text-zinc-300">{cap.provider}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">协议</dt>
                <dd className="text-zinc-300">{cap.protocol.toUpperCase()}</dd>
              </div>
              {cap.language && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">语言</dt>
                  <dd className="text-zinc-300">{cap.language}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-zinc-500">Stars</dt>
                <dd className="text-zinc-300">
                  {cap.stars.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Forks</dt>
                <dd className="text-zinc-300">
                  {cap.forks.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">贡献者</dt>
                <dd className="text-zinc-300">{cap.contributors}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">测试</dt>
                <dd className="text-zinc-300">
                  {cap.has_tests ? "有" : "无"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">TypeScript</dt>
                <dd className="text-zinc-300">
                  {cap.has_typescript ? "有" : "无"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">更新时间</dt>
                <dd className="text-zinc-300">
                  {new Date(cap.last_updated).toLocaleDateString("zh-CN")}
                </dd>
              </div>
            </dl>

            {cap.repo_url && (
              <a
                href={cap.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                查看源码
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
