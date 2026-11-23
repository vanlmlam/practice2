// ─────────────────────────────────────────────────────────────
// Next.js 16 Route Handler：GET /api/lottery
//
// 抽獎 API。每次被呼叫就擲一次骰子，30% 的機率中獎。
// ─────────────────────────────────────────────────────────────

// connection() 由 next/server 提供：讓這支 handler 等一個真正的
// HTTP request，而不是在 build 階段就把結果算好。
import { connection } from "next/server";

// ─────────────────────────────────────────────────────────────
// 抽獎參數
// ─────────────────────────────────────────────────────────────
// 中獎率 30%（0.3）。要調整就改這裡。
const WIN_RATE = 0.3;

// 中獎時頒發的獎品名稱。
const PRIZE = "免費課堂點心一份";

// ─────────────────────────────────────────────────────────────
// GET handler：有人打 GET /api/lottery 時就會執行這個函式
// ─────────────────────────────────────────────────────────────
export async function GET() {
  // 抽獎必須在 request time 發生：若這支 route 被 build 時 prerender，
  // 所有人拿到的都會是同一個結果（而且永遠不會變）。
  await connection();

  // Math.random() 會產生 0 到 1 之間（不含 1）的浮點數。
  // 拿它跟 WIN_RATE (0.3) 比較：小於 0.3 就是中獎，
  // 所以中獎率剛好是 30%。
  const win = Math.random() < WIN_RATE;

  // Response.json() 序列化物件並自動加上 Content-Type: application/json。
  return Response.json({
    // win：布林值，前端主要靠它判斷要不要顯示「中獎」的樣式。
    win,

    // prize：三元運算子（條件 ? 值A : 值B）——中獎才給獎品，否則給 null。
    // 前端看到 null 就知道不用顯示獎品欄位。
    prize: win ? PRIZE : null,

    // message：直接給人看的訊息，中獎與未中獎各一句。
    message: win ? "恭喜中獎！" : "再接再厲，下次一定中",
  });
}
