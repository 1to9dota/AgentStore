"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUser, isLoggedIn, logout } from "@/lib/auth";
import AuthModal from "./AuthModal";

/**
 * 用户菜单组件
 * 未登录：显示"登录"按钮
 * 已登录：显示用户名 + 下拉菜单
 */
export default function UserMenu() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 初始化和刷新登录状态
  const refreshAuth = () => {
    const logged = isLoggedIn();
    setLoggedIn(logged);
    if (logged) {
      const user = getUser();
      setUsername(user?.username || "");
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    setUsername("");
    setShowDropdown(false);
    router.refresh();
  };

  // 未登录状态
  if (!loggedIn) {
    return (
      <>
        <button
          onClick={() => setShowAuth(true)}
          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          登录
        </button>
        <AuthModal
          open={showAuth}
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            refreshAuth();
            router.refresh();
          }}
        />
      </>
    );
  }

  // 已登录状态
  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
      >
        {/* 用户头像占位 */}
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {username[0]?.toUpperCase() || "U"}
        </span>
        <span>{username}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${showDropdown ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-zinc-700 bg-zinc-900 py-1.5 shadow-xl">
          <button
            onClick={() => {
              setShowDropdown(false);
              router.push("/favorites");
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            我的收藏
          </button>
          <div className="mx-3 my-1 border-t border-zinc-800" />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
