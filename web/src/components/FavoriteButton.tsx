"use client";

import { useState, useEffect } from "react";
import { isLoggedIn } from "@/lib/auth";
import { toggleFavorite, getFavorites } from "@/lib/api";
import AuthModal from "./AuthModal";
import { useLocale } from "@/i18n";

interface FavoriteButtonProps {
  slug: string;
}

/**
 * 收藏按钮组件
 * 心形图标，点击 toggle 收藏/取消收藏
 * 未登录时弹出登录弹窗
 */
export default function FavoriteButton({ slug }: FavoriteButtonProps) {
  const { t } = useLocale();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [animating, setAnimating] = useState(false);

  // 检查是否已收藏
  useEffect(() => {
    if (isLoggedIn()) {
      getFavorites()
        .then((favs) => setFavorited(favs.includes(slug)))
        .catch(() => {});
    }
  }, [slug]);

  const handleClick = async () => {
    // 未登录提示
    if (!isLoggedIn()) {
      setShowAuth(true);
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const result = await toggleFavorite(slug);
      setFavorited(result.favorited);
      // 触发动画
      setAnimating(true);
      setTimeout(() => setAnimating(false), 300);
    } catch (err) {
      console.error("收藏操作失败:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        title={favorited ? t.favorites_page.unfavorite : t.user.my_favorites}
        className={`group flex h-11 w-11 items-center justify-center rounded-lg transition-all ${
          favorited
            ? "text-red-500 hover:text-red-400"
            : "text-zinc-500 hover:text-red-400"
        } ${animating ? "scale-125" : "scale-100"} disabled:opacity-50`}
      >
        <svg
          className="h-6 w-6 transition-transform group-hover:scale-110"
          fill={favorited ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
      </button>

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setShowAuth(false);
          // 登录成功后重新检查收藏状态
          getFavorites()
            .then((favs) => setFavorited(favs.includes(slug)))
            .catch(() => {});
        }}
      />
    </>
  );
}
