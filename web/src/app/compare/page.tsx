import { Suspense } from "react";
import { Metadata } from "next";
import { getAllCapabilities } from "@/lib/data";
import CompareClient from "./CompareClient";

// SSG 元数据
export const metadata: Metadata = {
  title: "对比插件 - AgentStore",
  description: "横向对比多个 Agent 插件的评分、特性与数据",
};

// 对比页面（Server Component 外壳）
// 在服务端读取所有插件数据，传给客户端组件
// Suspense 包裹是因为 CompareClient 使用了 useSearchParams
export default function ComparePage() {
  const allCapabilities = getAllCapabilities();

  // 只传递对比所需的精简数据，减少客户端 payload
  const capList = allCapabilities.map((c) => ({
    slug: c.slug,
    name: c.name,
    category: c.category,
    source: c.source,
    overall_score: c.overall_score,
    scores: c.scores,
    stars: c.stars,
    forks: c.forks,
    language: c.language,
    has_tests: c.has_tests,
    has_typescript: c.has_typescript,
    last_updated: c.last_updated,
    one_liner: c.one_liner,
    provider: c.provider,
  }));

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-zinc-800" />
            <div className="h-4 w-80 rounded bg-zinc-800" />
            <div className="h-12 w-full max-w-md rounded bg-zinc-800" />
          </div>
        </div>
      }
    >
      <CompareClient allCapabilities={capList} />
    </Suspense>
  );
}
