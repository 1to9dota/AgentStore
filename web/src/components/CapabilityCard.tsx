import { Fragment } from "react";
import Link from "next/link";
import { Capability, CATEGORIES } from "@/lib/types";
import ScoreBadge from "./ScoreBadge";

/**
 * 高亮文本中匹配的关键词
 * 将匹配部分用 <mark> 标签包裹
 */
function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query || !query.trim()) {
    return <>{text}</>;
  }

  // 转义正则特殊字符，防止搜索词中的特殊字符导致报错
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  if (parts.length === 1) {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query!.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-500/30 text-yellow-200 px-0.5"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

// 语言 -> 颜色映射
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  JavaScript: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Python: "bg-green-500/20 text-green-400 border-green-500/30",
  Rust: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Go: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Java: "bg-red-500/20 text-red-400 border-red-500/30",
  "C#": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  Ruby: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  PHP: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  Swift: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Kotlin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const DEFAULT_LANG_COLOR = "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

interface CapabilityCardProps {
  capability: Capability;
  /** 搜索关键词，传入后会高亮匹配文本 */
  highlightQuery?: string;
}

export default function CapabilityCard({ capability, highlightQuery }: CapabilityCardProps) {
  const { slug, name, one_liner, source, overall_score, category, stars, language, provider } =
    capability;

  const langColor = language
    ? LANGUAGE_COLORS[language] || DEFAULT_LANG_COLOR
    : null;

  return (
    <Link
      href={`/capability/${slug}`}
      className="card-hover group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="truncate text-lg font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors min-w-0">
              <HighlightText text={name} query={highlightQuery} />
            </h3>
            {/* 来源标签 */}
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                source === "mcp"
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-blue-500/20 text-blue-400"
              }`}
            >
              {source.toUpperCase()}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-zinc-400 line-clamp-2">
            <HighlightText text={one_liner} query={highlightQuery} />
          </p>
        </div>
        <ScoreBadge score={overall_score} size="md" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        {/* 分类 */}
        <span className="rounded-md bg-zinc-800 px-2 py-0.5">
          {CATEGORIES[category] || category}
        </span>

        {/* 语言标签（彩色） */}
        {language && langColor && (
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-medium ${langColor}`}
          >
            {language}
          </span>
        )}

        {/* Star 数 */}
        <span className="flex items-center gap-1">
          <svg
            className="h-3.5 w-3.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {stars.toLocaleString()}
        </span>

        {/* Provider 名 */}
        <span className="text-zinc-600">
          by {provider}
        </span>
      </div>
    </Link>
  );
}
