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
    // public/ 底下放的是靜態資源，不是我們的程式碼：
    // "public/pdf.worker.min.mjs" 是從 node_modules/pdfjs-dist 複製過來的
    // 壓縮檔，掃它只會產生上千個無意義的警告。
    "public/**",
  ]),
]);

export default eslintConfig;
