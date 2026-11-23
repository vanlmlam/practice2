"use client";

import { useEffect, useState } from "react";

const HEARTBEAT_MS = 15_000;
const CLIENT_ID_KEY = "practice2-client-id";

export default function OnlineUsers() {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    // 每個瀏覽器一個固定 id，存在 localStorage：重新整理不會被當成新訪客
    let clientId = localStorage.getItem(CLIENT_ID_KEY);
    if (!clientId) {
      clientId = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_KEY, clientId);
    }

    const beat = async () => {
      try {
        const res = await fetch(`/api/online?clientId=${encodeURIComponent(clientId!)}`);
        const data: { online: number } = await res.json();
        setOnline(data.online);
      } catch {
        // 網路失敗就安靜略過，下一次心跳會再試
      }
    };

    // 一進頁面先打一次，之後定期心跳維持「在線」狀態
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);

    const leave = () => {
      navigator.sendBeacon(`/api/online?clientId=${encodeURIComponent(clientId!)}`);
    };
    window.addEventListener("pagehide", leave);

    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", leave);
      // 這裡不呼叫 leave()：元件卸載可能是 React StrictMode 的重複掛載，
      // 送出 beacon 會誤刪仍在線的訪客。交給 TTL 逾時自然清除。
    };
  }, []);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">即時在線人數</p>
        <p className="mt-1 flex items-center justify-center gap-2 text-5xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {online ?? "—"}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          每 15 秒更新一次
        </p>
      </div>
    </div>
  );
}
