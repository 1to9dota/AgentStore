"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

import zhMessages from "./zh.json";
import enMessages from "./en.json";

// 支持的语言类型
export type Locale = "zh" | "en";

// 翻译对象类型（与 JSON 结构一致）
export type Messages = typeof zhMessages;

// 语言到翻译的映射
const messages: Record<Locale, Messages> = {
  zh: zhMessages,
  en: enMessages,
};

// localStorage 存储 key
const LOCALE_STORAGE_KEY = "agentstore-locale";

/**
 * 根据语言获取翻译对象
 */
export function getTranslations(locale: Locale): Messages {
  return messages[locale] ?? messages.zh;
}

// ---- React Context ----

interface LocaleContextValue {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "zh",
  t: zhMessages,
  setLocale: () => {},
});

/**
 * 获取当前语言和翻译的 hook
 */
export function useLocale() {
  return useContext(LocaleContext);
}

/**
 * 语言 Provider，包裹在应用外层
 * 从 localStorage 读取用户上次选择的语言，默认中文
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");
  const [mounted, setMounted] = useState(false);

  // 客户端挂载后从 localStorage 读取语言设置
  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (saved && (saved === "zh" || saved === "en")) {
      setLocaleState(saved);
    }
    setMounted(true);
  }, []);

  // 切换语言并持久化到 localStorage
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  }, []);

  const value: LocaleContextValue = {
    locale,
    t: getTranslations(locale),
    setLocale,
  };

  // 服务端渲染时使用默认中文，避免 hydration 不匹配
  if (!mounted) {
    return (
      <LocaleContext.Provider
        value={{ locale: "zh", t: zhMessages, setLocale }}
      >
        {children}
      </LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
