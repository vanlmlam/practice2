"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// react-pdf 需要瀏覽器的 DOM 與 pdf.js worker，不能在伺服器端渲染，
// 所以用 next/dynamic 的 ssr: false 延後載入。
// 註：ssr: false 只能在 Client Component 裡使用，所以這支檔案必須有 "use client"。
const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => (
    <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
      正在載入 PDF 閱讀器…
    </p>
  ),
});

// 示範用的 PDF。選這個是因為它有
// Access-Control-Allow-Origin: * 的標頭，瀏覽器才讀得到。
const SAMPLE_PDF =
  "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";

// 檢查是不是合法的 http(s) 網址。
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function PdfReader() {
  // input：輸入框裡的內容。
  const [input, setInput] = useState(SAMPLE_PDF);
  // loadedUrl：已經送出、正在讀取的 PDF 網址。
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  // error：輸入有問題時的訊息。
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();

    if (!value) {
      setError("請輸入 PDF 的網址");
      setLoadedUrl(null);
      return;
    }
    if (!isValidUrl(value)) {
      setError("請輸入正確的 http:// 或 https:// 網址");
      setLoadedUrl(null);
      return;
    }

    setError(null);
    setLoadedUrl(value);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* ── 輸入表單 ── */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <label
          htmlFor="pdf-url"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          PDF 網址
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="pdf-url"
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://example.com/file.pdf"
            className="w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-3 text-base outline-none transition-colors focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-white"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            載入 PDF
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => {
              setInput(SAMPLE_PDF);
              setError(null);
              setLoadedUrl(SAMPLE_PDF);
            }}
            className="text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            用範例 PDF 試試看
          </button>
          <span className="text-zinc-400 dark:text-zinc-600">
            提示：該網站必須開啟 CORS，瀏覽器才讀得到檔案
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </form>

      {/* ── 閱讀器 ── */}
      {loadedUrl ? (
        // key 換掉時 React 會重新掛載 PdfViewer，狀態（頁碼、縮放、錯誤）
        // 就會自動重設，不需要額外的 useEffect。
        <PdfViewer key={loadedUrl} file={loadedUrl} />
      ) : (
        <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          輸入 PDF 網址後按「載入 PDF」，就會直接顯示在這個頁面裡。
        </p>
      )}
    </div>
  );
}
