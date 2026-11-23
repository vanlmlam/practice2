import { connection } from "next/server";

// 中獎率 30%。要調整就改這裡。
const WIN_RATE = 0.3;
const PRIZE = "免費課堂點心一份";

export async function GET() {
  // 抽獎必須在 request time 發生：若這支 route 被 build 時 prerender，
  // 所有人拿到的都會是同一個結果。
  await connection();

  const win = Math.random() < WIN_RATE;

  return Response.json({
    win,
    prize: win ? PRIZE : null,
    message: win ? "恭喜中獎！" : "再接再厲，下次一定中",
  });
}
