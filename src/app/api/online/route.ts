import { connection } from "next/server";

// 前端每 15 秒送一次心跳；超過 45 秒沒再收到同一位訪客的心跳，就當作離線。
const CLIENT_TTL_MS = 45_000;

type OnlineStore = Map<string, number>; // clientId -> 最後心跳時間

// 掛在 globalThis 上，dev 模式 hot-reload 時不會被清掉。
const store = globalThis as typeof globalThis & {
  __onlineClients?: OnlineStore;
};

function getStore(): OnlineStore {
  if (!store.__onlineClients) {
    store.__onlineClients = new Map();
  }
  return store.__onlineClients;
}

function prune(now: number): void {
  const clients = getStore();
  for (const [id, lastSeen] of clients) {
    if (now - lastSeen > CLIENT_TTL_MS) {
      clients.delete(id);
    }
  }
}

export async function GET(request: Request) {
  await connection();

  const now = Date.now();
  const clientId = new URL(request.url).searchParams.get("clientId");

  // 有 clientId 就是一次心跳：更新它的最後活動時間
  if (clientId) {
    getStore().set(clientId, now);
  }

  prune(now);

  return Response.json({ online: getStore().size });
}

export async function POST(request: Request) {
  await connection();

  // 離開頁面時前端用 navigator.sendBeacon 呼叫這邊，馬上移除該訪客
  const clientId = new URL(request.url).searchParams.get("clientId");
  if (clientId) {
    getStore().delete(clientId);
  }

  const now = Date.now();
  prune(now);

  return Response.json({ online: getStore().size });
}
