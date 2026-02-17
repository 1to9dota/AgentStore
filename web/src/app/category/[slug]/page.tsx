import { notFound } from "next/navigation";
import {
  getCategories,
  getCapabilitiesByCategory,
} from "@/lib/data";
import { CATEGORIES } from "@/lib/types";
import CategoryClient from "./CategoryClient";

// SSG: 预生成所有分类页
export function generateStaticParams() {
  return getCategories().map((cat) => ({ slug: cat }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const label = CATEGORIES[slug] || slug;
    const caps = getCapabilitiesByCategory(slug);
    return {
      title: `${label} 分类 - AgentStore`,
      description: `浏览 ${label} 分类下的 ${caps.length} 个 MCP 插件，AI 驱动五维评分，助你选出最佳 Agent 能力。`,
      alternates: {
        canonical: `/category/${slug}`,
      },
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
  const label = CATEGORIES[slug] || slug;

  if (capabilities.length === 0 && !CATEGORIES[slug]) {
    notFound();
  }

  return (
    <CategoryClient
      capabilities={capabilities}
      label={label}
      slug={slug}
    />
  );
}
