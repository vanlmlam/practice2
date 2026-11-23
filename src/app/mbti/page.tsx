import type { Metadata } from "next";
import Link from "next/link";
import MbtiForm from "./MbtiForm";

export const metadata: Metadata = {
  title: "MBTI 性格測驗",
  description: "描述你的個性，由 MiniMax AI 分析你的 MBTI 類型",
};

export default function MbtiPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center gap-10 px-6 py-24 bg-white dark:bg-black">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            MBTI 性格測驗
          </h1>
          <p className="mt-3 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            描述一下你的個性與行為模式，按下按鈕後會呼叫{" "}
            <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
              /api/mbti
            </code>
            ，由 MiniMax AI 分析你的 MBTI 類型。
          </p>
        </div>

        <MbtiForm />

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
