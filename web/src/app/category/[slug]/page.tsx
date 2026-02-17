import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCategories,
  getCapabilitiesByCategory,
} from "@/lib/data";
import { CATEGORIES } from "@/lib/types";
import CapabilityCard from "@/components/CapabilityCard";

// SSG: 预生成所有分类页
export function generateStaticParams() {
  return getCategories().map((cat) => ({ slug: cat }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const label = CATEGORIES[slug] || slug;
    return {
      title: `${label} - AgentStore`,
      description: `Browse AI agent capabilities in the ${label} category`,
    };
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const capabilities = getCapabilitiesByCategory(slug);
  const label = CATEGORIES[slug];

  if (capabilities.length === 0 && !label) {
    notFound();
  }

  // 按分数排序
  const sorted = [...capabilities].sort(
    (a, b) => b.overall_score - a.overall_score
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* 面包屑 */}
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">
          首页
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{label || slug}</span>
      </nav>

      <h1 className="mb-2 text-3xl font-bold text-zinc-100">
        {label || slug}
      </h1>
      <p className="mb-8 text-zinc-500">
        共 {sorted.length} 个 Agent 能力
      </p>

      {sorted.length === 0 ? (
        <p className="text-zinc-500">该分类下暂无数据</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((cap) => (
            <CapabilityCard key={cap.slug} capability={cap} />
          ))}
        </div>
      )}
    </div>
  );
}
