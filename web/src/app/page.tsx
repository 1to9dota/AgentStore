import type { Metadata } from "next";
import { getAllCapabilities } from "@/lib/data";

import HomeClient from "./HomeClient";

// 首页独立 metadata
export const metadata: Metadata = {
  title: "AgentStore - 发现最佳 MCP 插件 | AI 驱动评级平台",
  description:
    "AgentStore 汇聚 200+ MCP 插件，提供五维雷达评分（可靠性、安全性、能力范围、社区口碑、易用性），帮助开发者快速找到最合适的 Agent 能力。",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  const capabilities = getAllCapabilities();
  return <HomeClient capabilities={capabilities} />;
}
