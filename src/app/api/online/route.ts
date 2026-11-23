// ─────────────────────────────────────────────────────────────
// Next.js 16 Route Handler：
//   GET  /api/online?clientId=xxx  → 心跳（登記／更新最後活動時間），回傳在線人數
//   POST /api/online?clientId=xxx  → 離線（馬上移除該訪客），回傳在線人數
//
// 即時在線人數 API。採用「心跳制」：前端定期送心跳，
// server 端超過一段時間沒收到某位訪客的心跳，就把他視為已離線。
// ─────────────────────────────────────────────────────────────

// connection() 由 next/server 提供：讓這支 handler 等一個真正的
// HTTP request，而不是在 build 階段就把結果算好。
import { connection } from "next/server";

// ─────────────────────────────────────────────────────────────
// 在線判定參數
// ─────────────────────────────────────────────────────────────
// 前端每 15 秒送一次心跳；超過 45 秒沒再收到同一位訪客的心跳，就當作離線。
// 45 秒 = 3 次心跳的間隔，前端就算短暫卡頓也不會被誤判離線。
const CLIENT_TTL_MS = 45_000;

// 在線訪客的資料結構：key 是 clientId，value 是最後一次心跳的時間戳（毫秒）。
type OnlineStore = Map<string, number>;

// ─────────────────────────────────────────────────────────────
// 在線訪客的儲存位置
// ─────────────────────────────────────────────────────────────
// 掛在 globalThis 上，dev 模式 hot-reload 時不會被清掉。
// 型別斷言：typeof globalThis & { __onlineClients?: OnlineStore }
// 表示 globalThis 上多了一個可選的 __onlineClients 欄位。
const store = globalThis as typeof globalThis & {
  __onlineClients?: OnlineStore;
};

// ─────────────────────────────────────────────────────────────
// 取得儲存區
// ─────────────────────────────────────────────────────────────
// getStore()：第一次呼叫時建立一個新的 Map，之後都回傳同一個。
function getStore(): OnlineStore {
  // 還沒建立過（undefined）才 new 一個。
  if (!store.__onlineClients) {
    store.__onlineClients = new Map();
  }
  // 回傳這個 Map 本身（不是複本），所以對它做的增刪都會反映到 globalThis 上。
  return store.__onlineClients;
}

// ─────────────────────────────────────────────────────────────
// 清除逾時的訪客
// ─────────────────────────────────────────────────────────────
// prune(now)：把「距今超過 TTL 沒心跳」的訪客從 Map 移除。
function prune(now: number): void {
  const clients = getStore();

  // for...of 走訪 Map 的每一組 [key, value]。
  for (const [id, lastSeen] of clients) {
    // now - lastSeen 是這個訪客沉默了多少毫秒。
    if (now - lastSeen > CLIENT_TTL_MS) {
      // 沉默太久 → 判定離線 → 刪掉。
      clients.delete(id);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// GET handler：心跳
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  // 等真正的 request 進來。
  await connection();

  // Date.now() 回傳「自 1970-01-01 起的毫秒數」，用來當時間戳。
  const now = Date.now();

  // 從查詢參數取得 clientId。前端用 localStorage 存一個固定 id，
  // 所以重新整理頁面不會被當成新訪客。
  const clientId = new URL(request.url).searchParams.get("clientId");

  // 有 clientId 就是一次心跳：把它的最後活動時間更新成現在。
  // Map.set() 若 key 已存在就覆蓋值，不存在就新增 —— 這正是我們要的。
  if (clientId) {
    getStore().set(clientId, now);
  }

  // 順手清掉已經逾時的訪客，避免 Map 無限膨脹。
  prune(now);

  // Map.size 是目前 Map 裡有幾個 key，也就是在線人數。
  return Response.json({ online: getStore().size });
}

// ─────────────────────────────────────────────────────────────
// POST handler：離線
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  // 等真正的 request 進來。
  await connection();

  // 離開頁面時前端用 navigator.sendBeacon 呼叫這邊，馬上移除該訪客。
  // sendBeacon 只能送 POST，所以離線訊號走 POST 而不是 DELETE。
  const clientId = new URL(request.url).searchParams.get("clientId");

  // Map.delete() 刪掉指定的 key；key 不存在也不會出錯。
  if (clientId) {
    getStore().delete(clientId);
  }

  const now = Date.now();

  // 順便把其他逾時的訪客也清掉。
  prune(now);

  // 回傳剩下的在線人數。
  return Response.json({ online: getStore().size });
}
