import { getAllCapabilities } from "@/lib/data";
import SearchClient from "./SearchClient";

export const metadata = {
  title: "搜索 MCP 插件 - AgentStore",
  description: "搜索 200+ MCP 插件，按名称、分类、语言快速筛选，找到最适合你的 Agent 能力。",
  alternates: {
    canonical: "/search",
  },
};

export default function SearchPage() {
  const capabilities = getAllCapabilities();
  return <SearchClient capabilities={capabilities} />;
}
