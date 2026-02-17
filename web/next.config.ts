import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 原生支持 Next.js SSG，无需 output: "export"
  // generateStaticParams 已在各页面配置，构建时自动预渲染
};

export default nextConfig;
