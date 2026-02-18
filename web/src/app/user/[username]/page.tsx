"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ScoreBadge from "@/components/ScoreBadge";
import type { UserProfile } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((p) => {
      fetch(`${API_URL}/api/v1/users/${encodeURIComponent(p.username)}/profile`)
        .then((res) => {
          if (!res.ok) throw new Error("用户不存在");
          return res.json();
        })
        .then(setProfile)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    });
  }, [params]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center text-zinc-500">
        加载中...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-zinc-200 mb-2">用户不存在</h1>
        <p className="text-zinc-500">{error || "找不到该用户"}</p>
        <Link href="/" className="mt-4 inline-block text-blue-400 hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      {/* 用户头部 */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white">
          {profile.username[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{profile.username}</h1>
          <p className="text-sm text-zinc-500">加入于 {formatDate(profile.created_at)}</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="mb-10 grid grid-cols-3 gap-4">
        {[
          { label: "收藏", value: profile.stats.favorites, color: "text-pink-400" },
          { label: "评论", value: profile.stats.comments, color: "text-blue-400" },
          { label: "提交", value: profile.stats.submissions, color: "text-green-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-5 text-center">
            <div className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="mt-1 text-sm text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 最近评论 */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">最近评论</h2>
        {profile.recent_comments.length === 0 ? (
          <p className="text-sm text-zinc-600">暂无评论</p>
        ) : (
          <div className="space-y-3">
            {profile.recent_comments.map((c, i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <Link href={`/capability/${c.slug}`} className="text-sm text-blue-400 hover:underline">
                    {c.slug}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-sm">{"★".repeat(c.rating)}</span>
                    <span className="text-xs text-zinc-600">{formatDate(c.created_at)}</span>
                  </div>
                </div>
                <p className="text-sm text-zinc-400">{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 最近收藏 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">最近收藏</h2>
        {profile.recent_favorites.length === 0 ? (
          <p className="text-sm text-zinc-600">暂无收藏</p>
        ) : (
          <div className="space-y-3">
            {profile.recent_favorites.map((f, i) => (
              <Link
                key={i}
                href={`/capability/${f.slug}`}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 transition-colors hover:border-zinc-700"
              >
                <span className="text-sm text-zinc-200">{f.name}</span>
                <div className="flex items-center gap-3">
                  <ScoreBadge score={f.overall_score} />
                  <span className="text-xs text-zinc-600">{formatDate(f.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
