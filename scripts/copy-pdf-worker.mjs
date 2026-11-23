// 把 pdf.js 的 worker 複製到 public/ 目錄。
//
// 為什麼要複製？
// react-pdf 需要一個 worker 檔案來處理 PDF 解析。設定 workerSrc 有兩種方式：
//   1. new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)
//      → 依賴 bundler 的 asset 解析，不同 bundler 行為不一樣，容易壞掉。
//   2. 放到 public/ 用絕對路徑載入 → 任何 bundler 都不影響，最穩。
// 我們選 2。
//
// 這支腳本會在 npm install 後自動執行（package.json 的 postinstall），
// 確保 pdfjs-dist 升級時 worker 也跟著更新。

import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..");

const source = join(
  projectRoot,
  "node_modules",
  "pdfjs-dist",
  "build",
  "pdf.worker.min.mjs"
);
const targetDir = join(projectRoot, "public");
const target = join(targetDir, "pdf.worker.min.mjs");

if (!existsSync(source)) {
  console.error(
    `[copy-pdf-worker] 找不到 ${source}\n` +
      `[copy-pdf-worker] 請確認 pdfjs-dist 已安裝（npm install pdfjs-dist）`
  );
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);

console.log("[copy-pdf-worker] 已更新 public/pdf.worker.min.mjs");
