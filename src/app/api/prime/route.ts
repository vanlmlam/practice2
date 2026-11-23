// ─────────────────────────────────────────────────────────────
// Next.js 16 Route Handler：GET /api/prime?n=97
//
// 質數判斷 API。查詢參數 n 傳一串數字進來，回傳它是不是質數。
// ─────────────────────────────────────────────────────────────

// connection() 由 next/server 提供：讓這支 handler 等一個真正的
// HTTP request，而不是在 build 階段就把結果算好。
import { connection } from "next/server";

// ─────────────────────────────────────────────────────────────
// 質數判斷演算法
// ─────────────────────────────────────────────────────────────
// 試除法：若 n 是合數，必定存在某個因數 ≤ √n，所以只需要試到 √n 為止。
//
// 優化：先排除 2、3 的倍數，之後只檢查 6k-1 / 6k+1 這兩種候選因數
//（因為除了 2、3 以外，所有質數都剛好是 6k±1 的形式）。
// 這樣比從 2 開始逐一試快大約 3 倍。
function isPrime(n: number): boolean {
  // 質數的定義是「大於 1，且只能被 1 和自己整除」，
  // 所以 0 和 1 都不是質數。
  if (n < 2) return false;

  // 2 和 3 本身是質數，要先特判，否則會被下面的「偶數／3 的倍數」規則誤殺。
  if (n === 2 || n === 3) return true;

  // 其他數字只要能被 2 或 3 整除，就一定不是質數。
  if (n % 2 === 0 || n % 3 === 0) return false;

  // 從 5 開始，每次 +6，依序檢查 i 與 i+2 兩個候選因數。
  // 迴圈條件 i * i <= n 代表已經超過 √n，不可能再有更小的因數了。
  for (let i = 5; i * i <= n; i += 6) {
    // n 能被 i 或 i+2 整除 → 找到了因數 → 不是質數。
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }

  // 整個迴圈走完都沒找到因數 → 沒有任何因數 → 是質數。
  return true;
}

// ─────────────────────────────────────────────────────────────
// GET handler：有人打 GET /api/prime?n=... 時就會執行這個函式
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  // 等真正的 request 進來。
  await connection();

  // request 是 Web 標準 Request 物件。request.url 是完整網址，
  // 用 URL 解析後就能從 searchParams 取出查詢參數。
  // get("n") 找不到這個參數時回傳 null，所以用 ?? 補成空字串。
  const raw = new URL(request.url).searchParams.get("n") ?? "";

  // ── 驗證輸入 ──
  // 只接受純數字字串。^ 開頭、$ 結尾代表整串都要符合；
  // \d 表示 0-9 的任一個數字；+ 表示一個或多次。
  // （開頭的 0 是允許的，例如 "007" 會被當成 7）
  if (!/^\d+$/.test(raw)) {
    // 第二個參數是 ResponseInit 物件，用來設定 HTTP status。
    // 400 = Bad Request，代表是呼叫端送來的東西有問題。
    return Response.json(
      { ok: false, error: "請輸入一串數字" },
      { status: 400 }
    );
  }

  // 把數字字串轉成真正的 number。Number("007") 會得到 7。
  const n = Number(raw);

  // Number 的精度上限是 9007199254740991（2^53 - 1），
  // 超過這個值 Number.isSafeInteger 會回 false，代表數字已經不精確了。
  if (!Number.isSafeInteger(n)) {
    return Response.json(
      { ok: false, error: "數字太大了，請輸入小於 9007199254740991 的數字" },
      { status: 400 }
    );
  }

  // 呼叫上面寫的質數判斷函式。
  const prime = isPrime(n);

  // 一切正常 → 回 200，帶上原始數字、判斷結果與給人看的訊息。
  return Response.json({
    ok: true,                                  // 代表這次查詢成功（前面兩種情況是 false）
    n,                                         // 查詢的數字
    prime,                                      // 是不是質數
    message: prime ? `${n} 是質數` : `${n} 不是質數`,  // 反引號是 template literal，可以嵌入變數
  });
}
