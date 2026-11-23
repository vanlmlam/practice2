// ─────────────────────────────────────────────────────────────
// Next.js 16 Route Handler：GET /api/hello
//
// 這是 App Router 的「特殊檔案」（special file）。檔案放在
// src/app/api/hello/route.ts 這個位置，網址就被定成 /api/hello；
// 檔名必須是 route.ts（或 route.js），不能改。
// ─────────────────────────────────────────────────────────────

// connection() 由 next/server 提供：它會讓這支 handler 停下來等一個
// 真正的 HTTP request，而不是在 build 階段就把結果算好。
import { connection } from "next/server";

// ─────────────────────────────────────────────────────────────
// 計數器的儲存位置
// ─────────────────────────────────────────────────────────────
// 把計數器掛在 globalThis 上，而不是 module scope。
// dev 模式下一旦改了檔案，module 會被重新 evaluate，module scope 的值會歸零；
// globalThis 在整個 process 生命週期內都存活，所以計數不會被 hot-reload 清掉。
//
// 型別的部分：typeof globalThis 是 globalThis 原本的型別，
// 用 & intersection 加上 { __helloCount?: number }，
// 等於告訴 TypeScript「這個物件上多了一個可選的 __helloCount 欄位」。
// 用 as 做型別斷言（assertion），不改變執行期的值。
const store = globalThis as typeof globalThis & { __helloCount?: number };

// ─────────────────────────────────────────────────────────────
// GET handler：有人打 GET /api/hello 時就會執行這個函式
// ─────────────────────────────────────────────────────────────
// 「export 的名稱 = HTTP method」是 Next.js 的對應規則：
// export GET / POST / PUT / DELETE ... 分別對應到同名的 HTTP method。
// 沒定義的方法（例如這支沒有 POST）會自動回 405 Method Not Allowed。
//
// 用 async 是因為裡面有 await connection()。
export async function GET() {
  // 等真正的 request 進來。若沒有這行，這支 route 會在 build 時被 prerender
  // 成 static，計數器就會固定在 build 當下的數字（每次回應都一樣）。
  await connection();

  // ?? 是 nullish coalescing（空值合併運算子）：
  // 左邊是 null 或 undefined 時才會用右邊的值，否則保留左邊。
  // 所以第一次進來時 count = 0 + 1 = 1，之後每打一次就遞增 1。
  const count = (store.__helloCount ?? 0) + 1;

  // 把最新的計數寫回 globalThis，下次進來時才讀得到。
  store.__helloCount = count;

  // Response.json() 會把傳入的物件序列化 JSON 字串，
  // 並自動補上 Content-Type: application/json；HTTP status 預設是 200。
  // 回傳的物件裡有兩個欄位：message（歡迎詞）與 count（目前累加次數）。
  return Response.json({ message: "歡迎來到這門課", count });
}
