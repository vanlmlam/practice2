"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// react-pdf 需要這兩個 CSS 來正確疊上文字層與註解（連結、選取）圖層。
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// ─────────────────────────────────────────────────────────────
// pdf.js worker 設定
// ─────────────────────────────────────────────────────────────
// worker 是 pdf.js 真正解析 PDF 的地方，必須在瀏覽器端另外載入一份。
// 這裡指向 public/ 底下的檔案（由 npm postinstall 的
// scripts/copy-pdf-worker.mjs 從 node_modules/pdfjs-dist 複製而來）。
// 用 public/ 的絕對路徑而不是 new URL(..., import.meta.url)，
// 是為了不依賴 bundler 對該寫法的解析行為，換 bundler 也不會壞。
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// react-pdf v11 的型別只宣告 file?: File，
// 但執行期其實也接受 { url: string }（見 Document.js 的 findDocumentSource）。
type DocumentFile = React.ComponentProps<typeof Document>["file"];

// 把 react-pdf / pdf.js 的錯誤訊息翻成使用者看得懂的中文。
function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/Failed to fetch|NetworkError|fetch/i.test(message)) {
    return "無法下載這個 PDF。可能是網址失效，或該網站沒有開放 CORS（跨來源讀取）—— 瀏覽器會擋下沒有 Access-Control-Allow-Origin 標頭的檔案。";
  }
  if (/Invalid PDF|Password|structure/i.test(message)) {
    return "這個檔案不是有效的 PDF（或是需要密碼保護的 PDF）。";
  }
  if (/worker/i.test(message)) {
    return "PDF worker 載入失敗，請確認 public/pdf.worker.min.mjs 存在（可執行 npm run postinstall 重新產生）。";
  }
  return `載入 PDF 失敗：${message}`;
}

export default function PdfViewer({ file }: { file: string }) {
  // numPages：總頁數，onLoadSuccess 會回報。
  const [numPages, setNumPages] = useState(0);
  // pageNumber：目前顯示第幾頁（從 1 開始）。
  const [pageNumber, setPageNumber] = useState(1);
  // zoom：縮倍率，用來乘在容器寬度上。
  const [zoom, setZoom] = useState(1);
  // error：載入失敗時的訊息。
  const [error, setError] = useState<string | null>(null);
  // containerWidth：容器寬度，用 ResizeObserver 量測，讓頁面剛好塞得下。
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);
  // 換一份 PDF 時要重設頁碼與錯誤狀態，這裡不用 useEffect 做，
  // 而是靠父層給 <PdfViewer key={url}> —— key 一變，React 就會重新掛載
  // 整個元件，狀態自然是全新的（用 useEffect + setState 會觸發多餘的重繪）。

  // 用 ResizeObserver 追蹤容器寬度，視窗縮放時也能即時調整。
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 頁面寬度 = 容器寬度扣掉左右留白，再乘上縮倍率。
  const pageWidth = Math.max(320, Math.round((containerWidth - 32) * zoom));

  return (
    <div className="flex w-full flex-col gap-4">
      {/* ── 工具列 ── */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ← 上一頁
        </button>

        <span className="min-w-20 text-center tabular-nums">
          {numPages === 0 ? "– / –" : `${pageNumber} / ${numPages}`}
        </span>

        <button
          type="button"
          onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          disabled={numPages === 0 || pageNumber >= numPages}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          下一頁 →
        </button>

        <span className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
          disabled={zoom <= 0.5}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          縮小 −
        </button>

        <span className="min-w-16 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
          disabled={zoom >= 3}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          放大 ＋
        </button>

        {numPages > 0 && (
          <>
            <span className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
            <button
              type="button"
              onClick={() => setPageNumber(1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              回到首頁
            </button>
          </>
        )}
      </div>

      {/* ── 錯誤訊息 ── */}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {/* ── PDF 內容 ── */}
      <div
        ref={containerRef}
        className="flex min-h-96 w-full justify-center overflow-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        {!error && (
          <Document
            file={{ url: file } as unknown as DocumentFile}
            onLoadSuccess={({ numPages: total }) => {
              setNumPages(total);
              setPageNumber(1);
            }}
            onLoadError={(err) => setError(friendlyError(err))}
            loading={
              <p className="self-center py-16 text-sm text-zinc-500 dark:text-zinc-400">
                正在載入 PDF…
              </p>
            }
            error={
              <p className="self-center py-16 text-sm text-red-600 dark:text-red-400">
                載入 PDF 失敗
              </p>
            }
          >
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer
              className="shadow-lg"
            />
          </Document>
        )}
      </div>
    </div>
  );
}
