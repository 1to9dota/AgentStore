import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // 客户端组件初始化时需要从 localStorage/sessionStorage 读取状态，
      // 这是 React 中合理的 useEffect 使用场景，降为 warning
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
