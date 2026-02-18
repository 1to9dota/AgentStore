import { notFound } from "next/navigation";
import {
  getAllCapabilities,
  getCapabilityBySlug,
} from "@/lib/data";
import CapabilityDetailClient from "@/components/CapabilityDetailClient";

// SSG: 预生成所有详情页
export function generateStaticParams() {
  return getAllCapabilities().map((c) => ({ slug: c.slug.split("/") }));
}

// 动态 metadata
export function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  return params.then(({ slug }) => {
    const fullSlug = slug.join("/");
    const cap = getCapabilityBySlug(fullSlug);
    if (!cap) return { title: "Not Found" };
    return {
      title: `${cap.name} - AgentStore`,
      description: cap.one_liner,
      alternates: { canonical: `/capability/${fullSlug}` },
      openGraph: {
        title: `${cap.name} - AgentStore`,
        description: cap.one_liner,
        type: "article",
      },
    };
  });
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

  const allCapabilities = getAllCapabilities();

  // JSON-LD 结构化数据（SEO 用，服务端渲染）
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
    author: { "@type": "Organization", name: cap.provider },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <CapabilityDetailClient cap={cap} allCapabilities={allCapabilities} fullSlug={fullSlug} />
    </>
  );
}
