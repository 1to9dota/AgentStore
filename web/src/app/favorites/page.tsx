import { Metadata } from "next";
import { getAllCapabilities } from "@/lib/data";
import FavoritesClient from "./FavoritesClient";
import { Capability } from "@/lib/types";

// SSG 元数据
export const metadata: Metadata = {
  title: "我的收藏 - AgentStore",
  description: "查看你收藏的 Agent 插件",
};

/**
 * 收藏页面（Server Component 外壳）
 * 在服务端读取所有插件数据，传给客户端组件
 * 客户端根据用户收藏的 slug 列表进行过滤展示
 */
export default function FavoritesPage() {
  // 服务端读取全部插件数据，传给客户端用于按 slug 匹配
  const allCapabilities: Capability[] = getAllCapabilities();

  return <FavoritesClient allCapabilities={allCapabilities} />;
}
