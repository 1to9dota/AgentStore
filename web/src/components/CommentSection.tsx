"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isLoggedIn } from "@/lib/auth";
import { getComments, postComment, toggleCommentLike, Comment } from "@/lib/api";
import AuthModal from "./AuthModal";

interface CommentSectionProps {
  slug: string;
}

/**
 * 星星评分组件
 */
function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`${readonly ? "cursor-default" : "cursor-pointer"} w-8 h-8 flex items-center justify-center transition-colors`}
        >
          <svg
            className={`h-5 w-5 ${
              star <= (hover || value) ? "text-yellow-400" : "text-zinc-600"
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

/**
 * 评论区组件
 * 显示评论列表 + 评论输入框
 */
export default function CommentSection({ slug }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  // 加载评论列表
  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await getComments(slug);
      setComments(data);
    } catch {
      // 评论加载失败不影响页面
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // 提交评论
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn()) {
      setShowAuth(true);
      return;
    }

    if (!content.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      await postComment(slug, content.trim(), rating);
      setContent("");
      setRating(5);
      // 刷新评论列表
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "评论失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="mb-6 text-lg font-semibold text-zinc-200">
        用户评价 ({comments.length})
      </h2>

      {/* 评论输入区 */}
      <form onSubmit={handleSubmit} className="mb-8">
        {isLoggedIn() ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">评分：</span>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下你的使用体验..."
              rows={4}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
            {error && (
              <div className="text-sm text-red-400">{error}</div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "提交中..." : "发表评论"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAuth(true)}
            className="w-full rounded-lg border border-dashed border-zinc-700 py-4 text-sm text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300"
          >
            登录后发表评论
          </button>
        )}
      </form>

      {/* 评论列表 */}
      {loading ? (
        <div className="py-8 text-center text-sm text-zinc-500">加载中...</div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-sm text-zinc-500">
          暂无评论，来写第一条吧
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border-t border-zinc-800 pt-5 first:border-t-0 first:pt-0"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {/* 用户头像 */}
                  <Link
                    href={`/user/${encodeURIComponent(comment.username)}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400 transition-colors hover:bg-zinc-700"
                  >
                    {comment.username[0]?.toUpperCase() || "U"}
                  </Link>
                  <Link
                    href={`/user/${encodeURIComponent(comment.username)}`}
                    className="truncate text-sm font-medium text-zinc-300 transition-colors hover:text-blue-400"
                  >
                    {comment.username}
                  </Link>
                  <StarRating value={comment.rating} readonly />
                </div>
                <span className="shrink-0 text-xs text-zinc-600">
                  {formatTime(comment.created_at)}
                </span>
              </div>
              <p className="ml-11 text-sm leading-relaxed text-zinc-400">
                {comment.content}
              </p>
              {/* 点赞按钮 */}
              <div className="ml-11 mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!isLoggedIn()) {
                      setShowAuth(true);
                      return;
                    }
                    try {
                      const result = await toggleCommentLike(comment.id);
                      // 更新本地评论的点赞数
                      setComments((prev) =>
                        prev.map((c) =>
                          c.id === comment.id
                            ? { ...c, likes_count: result.likes_count }
                            : c
                        )
                      );
                    } catch {
                      // 点赞失败静默处理
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-blue-400"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  {comment.likes_count > 0 && (
                    <span>{comment.likes_count}</span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 登录弹窗 */}
      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
      />
    </div>
  );
}
