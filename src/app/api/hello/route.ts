import { connection } from "next/server";

// 把計數器掛在 globalThis 上，而不是 module scope。
// dev 模式下一旦改了檔案，module 會被重新 evaluate，module scope 的值會歸零；
// globalThis 在整個 process 生命週期內都存活，所以計數不會被 hot-reload 清掉。
const store = globalThis as typeof globalThis & { __helloCount?: number };

export async function GET() {
  // 等真正的 request 進來。若沒有這行，這支 route 會在 build 時被 prerender
  // 成 static，計數器就會固定在 build 當下的數字。
  await connection();

  const count = (store.__helloCount ?? 0) + 1;
  store.__helloCount = count;

  return Response.json({ message: "歡迎來到這門課", count });
}
