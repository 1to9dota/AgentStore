import { MetadataRoute } from "next";
import { getAllCapabilities, getCategories } from "@/lib/data";

// 站点基础 URL，部署后替换为实际域名
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://agentstore.dev";

/**
 * 动态生成 sitemap.xml
 * 包含：首页、搜索页、所有分类页、所有插件详情页
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const capabilities = getAllCapabilities();
  const categories = getCategories();

  // 首页
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // 分类页
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/category/${cat}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // 插件详情页
  const capabilityPages: MetadataRoute.Sitemap = capabilities.map((cap) => ({
    url: `${BASE_URL}/capability/${cap.slug}`,
    lastModified: cap.last_updated ? new Date(cap.last_updated) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...capabilityPages];
}
