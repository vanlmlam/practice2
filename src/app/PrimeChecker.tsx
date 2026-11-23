"use client";

import { useState } from "react";

type PrimeResponse = {
  ok: boolean;
  n?: number;
  prime?: boolean;
  message?: string;
  error?: string;
};

export default function PrimeChecker() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<PrimeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/prime?n=${encodeURIComponent(input.trim())}`);
      const data: PrimeResponse = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: "查詢失敗，請稍後再試" });
    } finally {
      setLoading(false);
    }
  }

  const prime = result?.ok ? result.prime : undefined;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">質數檢查</p>
        <p className="mt-1 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          輸入一串數字
        </p>
      </div>

      <div className="flex w-full gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例如 97"
          aria-label="要檢查的數字"
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-3 text-base outline-none transition-colors focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "檢查中…" : "檢查"}
        </button>
      </div>

      {result && !result.ok && result.error && (
        <p className="text-center text-sm text-red-600 dark:text-red-400">
          {result.error}
        </p>
      )}

      {result?.ok && (
        <p
          className={
            prime
              ? "text-center text-lg font-semibold text-emerald-600 dark:text-emerald-400"
              : "text-center text-lg font-semibold text-zinc-600 dark:text-zinc-400"
          }
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
