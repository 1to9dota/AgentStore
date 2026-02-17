import { useState, useEffect } from "react";

/**
 * 通用防抖 Hook
 * 延迟 delay 毫秒后才更新返回值，避免高频触发
 *
 * @param value - 需要防抖的值
 * @param delay - 延迟毫秒数（默认 300ms）
 * @returns 防抖后的值
 *
 * @example
 * const [query, setQuery] = useState("");
 * const debouncedQuery = useDebounce(query, 300);
 * // debouncedQuery 在用户停止输入 300ms 后才更新
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 设置定时器，delay 后更新防抖值
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 每次 value 或 delay 变化时，清除上一个定时器
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
