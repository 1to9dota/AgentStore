"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { isLoggedIn } from "@/lib/auth";
import { getFavorites, toggleFavorite } from "@/lib/api";
import { Capability } from "@/lib/types";
import CapabilityCard from "@/components/CapabilityCard";
import AuthModal from "@/components/AuthModal";

interface FavoritesClientProps {
  allCapabilities: Capability[];
}

/**
 * 收藏页面客户端组件
 * - 未登录：提示登录
 * - 已登录：展示收藏的插件卡片，支持取消收藏
 */
export default function FavoritesClient({ allCapabilities }: FavoritesClientProps) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [favSlugs, setFavSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);

  // 初始化检查登录状态
  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  // 登录后加载收藏列表
  const loadFavorites = useCallback(async () => {
    if (!isLoggedIn()) {
      setLoading(false);
      return;
    }
    try {
      const slugs = await getFavorites();
      setFavSlugs(slugs);
    } catch (err) {
      console.error("加载收藏失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) {
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, [loggedIn, loadFavorites]);

  // 取消收藏
  const handleUnfavorite = async (slug: string) => {
    setRemovingSlug(slug);
    try {
      await toggleFavorite(slug);
      // 从列表中移除
      setFavSlugs((prev) => prev.filter((s) => s !== slug));
    } catch (err) {
      console.error("取消收藏失败:", err);
    } finally {
      setRemovingSlug(null);
    }
  };

  // 根据收藏 slug 列表匹配完整插件数据
  const favoriteCapabilities = allCapabilities.filter((c) =>
    favSlugs.includes(c.slug)
  );

  // ========== 未登录状态 ==========
  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <div className="flex flex-col items-center text-center">
          {/* 心形图标 */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800/50">
            <svg
              className="h-10 w-10 text-zinc-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
          </div>
          <h1 className="mb-3 text-2xl font-bold text-zinc-100">我的收藏</h1>
          <p className="mb-8 text-zinc-400">
            登录后即可收藏喜欢的插件，方便随时查看
          </p>
          <button
            onClick={() => setShowAuth(true)}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            登录 / 注册
          </button>
          <AuthModal
            open={showAuth}
            onClose={() => setShowAuth(false)}
            onSuccess={() => {
              setShowAuth(false);
              setLoggedIn(true);
            }}
          />
        </div>
      </div>
    );
  }

  // ========== 加载中 ==========
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-8 text-2xl font-bold text-zinc-100">我的收藏</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="mb-3 h-5 w-3/4 rounded bg-zinc-800" />
              <div className="mb-2 h-4 w-full rounded bg-zinc-800" />
              <div className="h-4 w-1/2 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== 空状态 ==========
  if (favoriteCapabilities.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800/50">
            <svg
              className="h-10 w-10 text-zinc-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
          </div>
          <h1 className="mb-3 text-2xl font-bold text-zinc-100">还没有收藏</h1>
          <p className="mb-8 text-zinc-400">
            去发现插件吧，收藏你感兴趣的 Agent 能力
          </p>
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            浏览插件
          </Link>
        </div>
      </div>
    );
  }

  // ========== 收藏列表 ==========
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">
          我的收藏
          <span className="ml-2 text-base font-normal text-zinc-500">
            ({favoriteCapabilities.length})
          </span>
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {favoriteCapabilities.map((cap) => (
          <div key={cap.slug} className="group/fav relative">
            <CapabilityCard capability={cap} />
            {/* 取消收藏按钮，悬停时显示 */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleUnfavorite(cap.slug);
              }}
              disabled={removingSlug === cap.slug}
              title="取消收藏"
              className="absolute right-3 top-3 z-10 rounded-lg bg-zinc-900/80 p-1.5 text-red-500 opacity-0 backdrop-blur transition-all hover:bg-zinc-800 hover:text-red-400 group-hover/fav:opacity-100 disabled:opacity-50"
            >
              {removingSlug === cap.slug ? (
                // 加载中旋转动画
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                // 实心心形图标
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
