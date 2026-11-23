import type { Metadata } from "next";
import Link from "next/link";
import PdfReader from "./PdfReader";

export const metadata: Metadata = {
  title: "PDF 閱讀器",
  description: "輸入 PDF 網址，直接在頁面裡閱讀",
};

export default function PdfPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center gap-10 px-6 py-24 bg-white dark:bg-black">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            PDF 閱讀器
          </h1>
          <p className="mt-3 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            貼上 PDF 的網址，按下按鈕就會直接讀取並顯示在這個頁面裡。
          </p>
        </div>

        <PdfReader />

        <Link
          href="/"
          className="text-sm text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← 回首頁
        </Link>
      </main>
    </div>
  );
}
