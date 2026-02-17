import { getAllCapabilities } from "@/lib/data";
import SearchClient from "./SearchClient";

export const metadata = {
  title: "搜索 - AgentStore",
  description: "搜索 AI Agent 能力",
};

export default function SearchPage() {
  const capabilities = getAllCapabilities();
  return <SearchClient capabilities={capabilities} />;
}
