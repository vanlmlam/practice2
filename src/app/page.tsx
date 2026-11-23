import HelloCounter from "./HelloCounter";
import LotteryButton from "./LotteryButton";
import OnlineUsers from "./OnlineUsers";
import PrimeChecker from "./PrimeChecker";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-10 px-6 py-24 bg-white dark:bg-black">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            歡迎來到這門課
          </h1>
          <p className="mt-3 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            按一下按鈕就會呼叫 <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">/api/hello</code>，
            每次呼叫都會讓計數器加一。
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center justify-center gap-8">
          <HelloCounter />
          <LotteryButton />
          <PrimeChecker />
          <OnlineUsers />
        </div>
      </main>
    </div>
  );
}
