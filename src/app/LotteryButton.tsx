"use client";

import { useState } from "react";

type LotteryResponse = {
  win: boolean;
  prize: string | null;
  message: string;
};

export default function LotteryButton() {
  const [result, setResult] = useState<LotteryResponse | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/lottery");
      if (!res.ok) {
        throw new Error(`伺服器回應 ${res.status}`);
      }
      const data: LotteryResponse = await res.json();
      setResult(data);
      setAttempts((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "抽獎失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">抽獎</p>
        <p className="mt-1 text-lg font-medium text-zinc-900 dark:text-zinc-50">
          中獎率 30%
        </p>
        {attempts > 0 && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            已抽 {attempts} 次
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "抽獎中…" : "抽獎"}
      </button>

      {result && !error && (
        <div className="text-center">
          <p
            className={
              result.win
                ? "text-lg font-semibold text-emerald-600 dark:text-emerald-400"
                : "text-lg font-semibold text-zinc-600 dark:text-zinc-400"
            }
          >
            {result.message}
          </p>
          {result.win && result.prize && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              獎品：{result.prize}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
