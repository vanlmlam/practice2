"use client";

import { useState } from "react";

type HelloResponse = {
  message: string;
  count: number;
};

export default function HelloCounter() {
  const [message, setMessage] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hello");
      if (!res.ok) {
        throw new Error(`伺服器回應 ${res.status}`);
      }
      const data: HelloResponse = await res.json();
      setMessage(data.message);
      setCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "請求失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">目前造訪次數</p>
        <p className="mt-1 text-5xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {count ?? "—"}
        </p>
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "呼叫中…" : "打招呼"}
      </button>

      {message && !error && (
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      )}

      {error && (
        <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
