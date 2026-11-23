"use client";

import { useState } from "react";

// /api/mbti 回應的資料結構
type MbtiResponse = {
  ok: boolean;
  mbti?: string;
  nickname?: string;
  summary?: string;
  traits?: string[];
  emoji?: string;
  error?: string;
};

export default function MbtiForm() {
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<MbtiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/mbti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data: MbtiResponse = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: "連線失敗，請稍後再試" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <label
          htmlFor="mbti-description"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          描述一下你的個性
        </label>

        <textarea
          id="mbti-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="例如：我喜歡獨處，平常不太愛跟陌生人講話，但跟熟人會聊很多。做事喜歡先想好計畫再執行，壓力大時會鑽牛角尖。"
          className="w-full resize-y rounded-lg border border-zinc-300 bg-transparent px-4 py-3 text-base leading-7 outline-none transition-colors focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-white"
        />

        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-zinc-400">{description.length} / 2000</span>
          <button
            type="submit"
            disabled={loading || !description.trim()}
            className="rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "分析中…" : "開始分析"}
          </button>
        </div>
      </form>

      {loading && (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          MiniMax 正在分析你的個性，請稍候…
        </p>
      )}

      {result && !result.ok && result.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {result.error}
        </p>
      )}

      {result?.ok && (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center">
            <p className="text-6xl" aria-hidden="true">
              {result.emoji}
            </p>
            <p className="mt-3 text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {result.mbti}
            </p>
            <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">
              {result.nickname}
            </p>
          </div>

          <p className="w-full text-center text-base leading-8 text-zinc-700 dark:text-zinc-300">
            {result.summary}
          </p>

          {result.traits && result.traits.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {result.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {trait}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
