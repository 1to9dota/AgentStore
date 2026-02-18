"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { login, register } from "@/lib/auth";
import { useLocale } from "@/i18n";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 登录/注册弹窗组件
 * 支持登录和注册两个 Tab 切换
 *
 * 定位策略：
 * - 移动端（< 768px）：贴底部 bottom sheet
 * - 桌面端（>= 768px）：inline style 固定在 Navbar 下方水平居中
 *   （放弃 Tailwind md: 响应式，直接用 JS 判断避免 v4 兼容问题）
 */
export default function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const { t } = useLocale();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!open || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
      setUsername("");
      setPassword("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.operation_failed);
    } finally {
      setLoading(false);
    }
  };

  // 桌面端：绝对定位在 Navbar 下方 80px，水平居中
  const cardStyle: React.CSSProperties = isDesktop
    ? {
        position: "absolute",
        top: "72px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "448px",
        bottom: "auto",
        right: "auto",
      }
    : {
        // 移动端：贴底部
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
      };

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗卡片 */}
      <div
        className="z-10 border border-zinc-700 bg-zinc-900 p-6 pb-8 shadow-2xl"
        style={{
          ...cardStyle,
          borderRadius: isDesktop ? "1rem" : "1rem 1rem 0 0",
        }}
      >
        {/* 移动端拖拽条 */}
        {!isDesktop && (
          <div className="mb-4 flex justify-center">
            <div className="h-1 w-10 rounded-full bg-zinc-600" />
          </div>
        )}

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Tab 切换 */}
        <div className="mb-6 flex gap-1 rounded-lg bg-zinc-800 p-1">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "login"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            {t.auth.login}
          </button>
          <button
            onClick={() => { setTab("register"); setError(""); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "register"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-300"
            }`}
          >
            {t.auth.register}
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">{t.auth.username}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder={t.auth.username_placeholder}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">{t.auth.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder={t.auth.password_placeholder}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t.auth.submitting : tab === "login" ? t.auth.login : t.auth.register}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
