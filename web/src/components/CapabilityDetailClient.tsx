"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { CATEGORIES, SCORE_LABELS, SCORE_LABELS_EN, type Capability, type CapabilityScores } from "@/lib/types";
import RadarChart from "@/components/RadarChart";
import ScoreBadge from "@/components/ScoreBadge";
import FavoriteButton from "@/components/FavoriteButton";
import CompareButton from "@/components/CompareButton";
import CommentSection from "@/components/CommentSection";
import SimilarPlugins from "@/components/SimilarPlugins";
import CopyCodeBlock from "@/components/CopyCodeBlock";
import { useLocale } from "@/i18n";

const CLIENT_BADGE_STYLES: Record<string, string> = {
  claude: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  cursor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  vscode: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  windsurf: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  cline: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const CLIENT_LABELS: Record<string, string> = {
  claude: "Claude",
  cursor: "Cursor",
  vscode: "VS Code",
  windsurf: "Windsurf",
  cline: "Cline",
};

function DependenciesList({ deps, isZh }: { deps: string[]; isZh: boolean }) {
  if (!deps || deps.length === 0) return null;
  const visible = deps.slice(0, 5);
  const rest = deps.slice(5);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="mb-3 text-lg font-semibold text-zinc-200">
        {isZh ? "主要依赖" : "Dependencies"}
      </h2>
      <div className="flex flex-wrap gap-2">
        {visible.map((dep) => (
          <span key={dep} className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-mono text-zinc-300">
            {dep}
          </span>
        ))}
      </div>
      {rest.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            {isZh ? `展开全部（还有 ${rest.length} 个）` : `Show all (${rest.length} more)`}
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {rest.map((dep) => (
              <span key={dep} className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-mono text-zinc-300">
                {dep}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? "bg-emerald-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-sm text-zinc-400">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-zinc-300">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

interface Props {
  cap: Capability;
  allCapabilities: Capability[];
  fullSlug: string;
}

export default function CapabilityDetailClient({ cap, allCapabilities, fullSlug }: Props) {
  const { locale } = useLocale();
  const isZh = locale === "zh";

  const scoreLabels = isZh ? SCORE_LABELS : SCORE_LABELS_EN;
  const dimensions = Object.keys(scoreLabels) as (keyof CapabilityScores)[];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
      {/* 面包屑 */}
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">
          {isZh ? "首页" : "Home"}
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/category/${cap.category}`} className="hover:text-zinc-300 transition-colors">
          {CATEGORIES[cap.category] || cap.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{cap.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* 左侧主内容 */}
        <div className="lg:col-span-2 space-y-8">
          {/* 头部 */}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-zinc-100">{cap.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                cap.source === "mcp" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
              }`}>
                {cap.source.toUpperCase()}
              </span>
              <ScoreBadge score={cap.overall_score} label={isZh ? "总分" : "Score"} size="lg" />
              {cap.latest_version && (
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-mono text-zinc-300">
                  {cap.latest_version}
                </span>
              )}
              <FavoriteButton slug={fullSlug} />
              <CompareButton slug={fullSlug} />
            </div>

            {cap.supported_clients && cap.supported_clients.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-zinc-500 self-center mr-1">
                  {isZh ? "兼容:" : "Works with:"}
                </span>
                {cap.supported_clients.map((client) => (
                  <span key={client} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    CLIENT_BADGE_STYLES[client] || "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}>
                    {CLIENT_LABELS[client] || client}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-3 text-zinc-400 leading-relaxed">{cap.description}</p>
          </div>

          {/* 雷达图 + 分数条 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-200">
              {isZh ? "五维评分" : "Five-Dimension Scores"}
            </h2>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="w-48 sm:w-auto shrink-0">
                <RadarChart scores={cap.scores} size={260} />
              </div>
              <div className="flex-1 w-full space-y-3">
                {dimensions.map((dim) => (
                  <ScoreBar key={dim} label={scoreLabels[dim]} score={cap.scores[dim]} />
                ))}
              </div>
            </div>
          </div>

          {/* 依赖列表 */}
          {cap.dependencies && cap.dependencies.length > 0 && (
            <DependenciesList deps={cap.dependencies} isZh={isZh} />
          )}

          {/* AI 分析 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-3 text-lg font-semibold text-zinc-200">
              {isZh ? "AI 分析" : "AI Analysis"}
            </h2>
            <p className="text-zinc-400 leading-relaxed">{cap.ai_summary}</p>
          </div>

          {/* 安装指南 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-3 text-lg font-semibold text-zinc-200">
              {isZh ? "安装指南" : "Installation Guide"}
            </h2>
            <CopyCodeBlock>
              <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-950 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-code:text-emerald-400">
                <ReactMarkdown>{cap.install_guide}</ReactMarkdown>
              </div>
            </CopyCodeBlock>
          </div>

          {/* 使用方法 */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-3 text-lg font-semibold text-zinc-200">
              {isZh ? "使用方法" : "Usage Guide"}
            </h2>
            <CopyCodeBlock>
              <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-950 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-code:text-emerald-400">
                <ReactMarkdown>{cap.usage_guide}</ReactMarkdown>
              </div>
            </CopyCodeBlock>
          </div>

          {/* 安全说明 */}
          {cap.safety_notes && (
            <div className={`rounded-xl border p-6 ${
              cap.scores.safety < 7
                ? "border-red-500/30 bg-red-500/5"
                : "border-emerald-500/30 bg-emerald-500/5"
            }`}>
              <h2 className="mb-3 text-lg font-semibold text-zinc-200">
                {cap.scores.safety < 7
                  ? (isZh ? "⚠ 安全提示" : "⚠ Safety Warning")
                  : (isZh ? "安全说明" : "Safety Notes")}
              </h2>
              <p className="text-zinc-400 leading-relaxed">{cap.safety_notes}</p>
            </div>
          )}

          {/* 相似插件 */}
          <SimilarPlugins current={cap} allCapabilities={allCapabilities} />

          {/* 评论区 */}
          <CommentSection slug={fullSlug} />
        </div>

        {/* 右侧边栏 */}
        <aside className="order-last lg:order-none space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              {isZh ? "项目信息" : "Project Info"}
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">{isZh ? "提供者" : "Provider"}</dt>
                <dd className="text-zinc-300">{cap.provider}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">{isZh ? "协议" : "Protocol"}</dt>
                <dd className="text-zinc-300">{cap.protocol.toUpperCase()}</dd>
              </div>
              {cap.language && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">{isZh ? "语言" : "Language"}</dt>
                  <dd className="text-zinc-300">{cap.language}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-zinc-500">Stars</dt>
                <dd className="text-zinc-300">{cap.stars.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Forks</dt>
                <dd className="text-zinc-300">{cap.forks.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">{isZh ? "贡献者" : "Contributors"}</dt>
                <dd className="text-zinc-300">{cap.contributors}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">{isZh ? "测试" : "Tests"}</dt>
                <dd className="text-zinc-300">
                  {cap.has_tests ? (isZh ? "有" : "Yes") : (isZh ? "无" : "No")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">TypeScript</dt>
                <dd className="text-zinc-300">
                  {cap.has_typescript ? (isZh ? "有" : "Yes") : (isZh ? "无" : "No")}
                </dd>
              </div>
              {cap.latest_version && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">{isZh ? "版本" : "Version"}</dt>
                  <dd className="text-zinc-300 font-mono text-xs">{cap.latest_version}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-zinc-500">{isZh ? "更新时间" : "Updated"}</dt>
                <dd className="text-zinc-300">
                  {new Date(cap.last_updated).toLocaleDateString(isZh ? "zh-CN" : "en-US")}
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
                {isZh ? "查看源码" : "View Source"}
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
