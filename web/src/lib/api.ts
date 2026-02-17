/**
 * API 客户端模块
 * 封装带认证的请求、收藏、评论等接口
 */

import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

/**
 * 带认证 header 的 fetch 封装
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

// ========== 收藏相关 ==========

/**
 * 切换收藏状态（收藏/取消收藏）
 * 后端返回 {action: "favorited" | "unfavorited", slug}
 */
export async function toggleFavorite(
  slug: string
): Promise<{ favorited: boolean }> {
  const res = await fetchWithAuth(
    `${API_URL}/api/v1/favorites/${encodeURIComponent(slug)}`,
    { method: "POST" }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "操作失败");
  }

  const data = await res.json();
  return { favorited: data.action === "favorited" };
}

/**
 * 获取当前用户的收藏列表
 * 后端返回 {favorites: [{slug, created_at}], total}，提取 slug 列表
 */
export async function getFavorites(): Promise<string[]> {
  const res = await fetchWithAuth(`${API_URL}/api/v1/favorites`);

  if (!res.ok) {
    throw new Error("获取收藏列表失败");
  }

  const data = await res.json();
  return (data.favorites || []).map((f: { slug: string }) => f.slug);
}

// ========== 评论相关 ==========

export interface Comment {
  id: number;
  username: string;
  content: string;
  rating: number;
  created_at: string;
}

/**
 * 发表评论
 */
export async function postComment(
  slug: string,
  content: string,
  rating: number
): Promise<Comment> {
  const res = await fetchWithAuth(
    `${API_URL}/api/v1/comments/${encodeURIComponent(slug)}`,
    {
      method: "POST",
      body: JSON.stringify({ content, rating }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "评论失败");
  }

  return res.json();
}

/**
 * 获取某个 capability 的评论列表
 * 后端返回 {comments: [...], total, avg_rating}，提取 comments 数组
 */
export async function getComments(slug: string): Promise<Comment[]> {
  const res = await fetch(
    `${API_URL}/api/v1/comments/${encodeURIComponent(slug)}`
  );

  if (!res.ok) {
    throw new Error("获取评论失败");
  }

  const data = await res.json();
  return data.comments || [];
}
