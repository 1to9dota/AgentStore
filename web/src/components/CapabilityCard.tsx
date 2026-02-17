import Link from "next/link";
import { Capability, CATEGORIES } from "@/lib/types";
import ScoreBadge from "./ScoreBadge";

interface CapabilityCardProps {
  capability: Capability;
}

export default function CapabilityCard({ capability }: CapabilityCardProps) {
  const { slug, name, one_liner, source, overall_score, category, stars } =
    capability;

  return (
    <Link
      href={`/capability/${slug}`}
      className="group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors">
              {name}
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
            {one_liner}
          </p>
        </div>
        <ScoreBadge score={overall_score} size="md" />
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
        {/* 分类 */}
        <span className="rounded-md bg-zinc-800 px-2 py-0.5">
          {CATEGORIES[category] || category}
        </span>
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
        {/* 语言 */}
        {capability.language && (
          <span className="text-zinc-500">{capability.language}</span>
        )}
      </div>
    </Link>
  );
}
