"use client";

import { useState, useCallback, useEffect, useRef } from "react";

/**
 * 代码块复制按钮包装器
 * 遍历容器内所有 <pre> 元素，在右上角添加复制按钮
 */
export default function CopyCodeBlock({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 查找所有 <pre> 并注入复制按钮
    const pres = container.querySelectorAll("pre");
    const cleanups: (() => void)[] = [];

    pres.forEach((pre) => {
      // 确保 pre 父级有 relative 定位
      pre.style.position = "relative";

      const btn = document.createElement("button");
      btn.className =
        "absolute top-2 right-2 rounded-md bg-zinc-700/80 px-2 py-1 text-xs text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-600 hover:text-zinc-100";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code");

      // hover 显示
      const showBtn = () => { btn.style.opacity = "1"; };
      const hideBtn = () => { btn.style.opacity = "0"; };
      pre.addEventListener("mouseenter", showBtn);
      pre.addEventListener("mouseleave", hideBtn);

      // 点击复制
      const handleClick = async () => {
        const code = pre.querySelector("code")?.textContent || pre.textContent || "";
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 2000);
        } catch {
          btn.textContent = "Failed";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 2000);
        }
      };
      btn.addEventListener("click", handleClick);

      pre.appendChild(btn);

      cleanups.push(() => {
        pre.removeEventListener("mouseenter", showBtn);
        pre.removeEventListener("mouseleave", hideBtn);
        btn.removeEventListener("click", handleClick);
        btn.remove();
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return <div ref={containerRef}>{children}</div>;
}
