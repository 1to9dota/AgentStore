"use client";

import { useLocale } from "@/i18n";

/**
 * 语言切换按钮
 * 显示 "中/EN"，点击切换中英文
 */
export default function LanguageSwitch() {
  const { locale, setLocale } = useLocale();

  const toggle = () => {
    setLocale(locale === "zh" ? "en" : "zh");
  };

  return (
    <button
      onClick={toggle}
      className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-700 hover:text-zinc-100"
      aria-label="切换语言 / Switch Language"
      title={locale === "zh" ? "Switch to English" : "切换到中文"}
    >
      {locale === "zh" ? (
        <>
          <span className="text-blue-400">中</span>
          <span className="mx-0.5 text-zinc-600">/</span>
          <span className="text-zinc-500">EN</span>
        </>
      ) : (
        <>
          <span className="text-zinc-500">中</span>
          <span className="mx-0.5 text-zinc-600">/</span>
          <span className="text-blue-400">EN</span>
        </>
      )}
    </button>
  );
}
