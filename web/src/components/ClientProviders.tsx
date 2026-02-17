"use client";

import { LocaleProvider } from "@/i18n";

/**
 * 客户端 Provider 包装器
 * 在 Server Component 的 layout.tsx 中使用，为客户端组件提供 Context
 */
export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
