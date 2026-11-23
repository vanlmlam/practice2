import { connection } from "next/server";

// 試除法：先排除 2、3 的倍數，之後只檢查 6k-1 / 6k+1 的候選因數。
function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2 || n === 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;

  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

export async function GET(request: Request) {
  await connection();

  const raw = new URL(request.url).searchParams.get("n") ?? "";

  // 只接受純數字字串（允許開頭的 0，例如 "007" → 7）
  if (!/^\d+$/.test(raw)) {
    return Response.json(
      { ok: false, error: "請輸入一串數字" },
      { status: 400 }
    );
  }

  const n = Number(raw);

  if (!Number.isSafeInteger(n)) {
    return Response.json(
      { ok: false, error: "數字太大了，請輸入小於 9007199254740991 的數字" },
      { status: 400 }
    );
  }

  const prime = isPrime(n);

  return Response.json({
    ok: true,
    n,
    prime,
    message: prime ? `${n} 是質數` : `${n} 不是質數`,
  });
}
