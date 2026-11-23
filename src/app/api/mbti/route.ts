// ─────────────────────────────────────────────────────────────
// Next.js 16 Route Handler：POST /api/mbti
//
// MBTI 性格分析 API。接收前端送來的「個性描述」，
// 交給 MiniMax 分析後回傳 MBTI 類型與相關資訊。
//
// 為什麼用官方 Anthropic SDK？
// MiniMax 提供 Anthropic 相容端點（/anthropic/v1/messages），
// 所以可以直接用 @anthropic-ai/sdk，把 baseURL 指向 MiniMax 即可。
// ─────────────────────────────────────────────────────────────

import Anthropic, {
  APIConnectionError,
  APIError,
  AuthenticationError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import { connection } from "next/server";

// ─────────────────────────────────────────────────────────────
// MiniMax 設定
// ─────────────────────────────────────────────────────────────
// 模型名稱。要換模型改這裡。
const MODEL = "MiniMax-M3";

// MiniMax 的 Anthropic 相容端點。可用環境變數覆寫。
const BASE_URL = process.env.MINIMAX_BASE_URL ?? "https://api.minimax.cn/anthropic";

// 描述字數上限，避免使用者貼一整篇文章進來。
const MAX_DESCRIPTION_LENGTH = 2000;

// 16 種 MBTI 類型。回應的 mbti 欄位必須是其中之一。
const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

type MbtiType = (typeof MBTI_TYPES)[number];

// ─────────────────────────────────────────────────────────────
// 給模型的系統提示詞
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `你是一位資深的 MBTI 性格分析師。
請根據使用者描述的個性、行為模式與生活習慣，推測他的 MBTI 類型。

分析時請考慮四個維度：
- E/I（外向／內向）： 從哪裡獲得能量、社交需求
- S/N（實感／直覺): 关注具體事實還是抽象概念、重視實務還是可能性
- T/F（思考／情感): 做決定時依據邏輯還是價值觀與他人感受
- J/P（判斷／感知): 喜歡計畫與秩序，還是保持彈性隨機應變

輸出規則：
- 所有文字使用繁體中文
- nickname 是簡短的中文暱稱，不要出現在 MBTI 類型名稱本身
- summary 用 2-3 句話描述這個個性特徵與行為模式
- traits 給 3 到 5 個特質形容詞
- emoji 給一個最能代表這個類型的 emoji
- 只輸出 JSON，不要輸出任何其他文字`;

// ─────────────────────────────────────────────────────────────
// 結構化輸出的 JSON Schema
// ─────────────────────────────────────────────────────────────
// 交給 output_config.format，模型就會嚴格照這個 schema 回傳。
const MBTI_SCHEMA = {
  type: "object",
  properties: {
    // enum 限定只能是 16 種 MBTI 類型之一。
    mbti: { type: "string", enum: [...MBTI_TYPES] },
    // 中文暱稱。
    nickname: { type: "string" },
    // 個性描述。
    summary: { type: "string" },
    // 特質形容詞陣列。
    traits: { type: "array", items: { type: "string" } },
    // 代表性 emoji。
    emoji: { type: "string" },
  },
  required: ["mbti", "nickname", "summary", "traits", "emoji"],
  additionalProperties: false,
};

// ─────────────────────────────────────────────────────────────
// 把模型回傳的文字解析成 JSON
// ─────────────────────────────────────────────────────────────
// 模型偶爾會在 JSON 前加上 <think>…</think> 的思考區塊，
// 所以先把它剝掉再 parse。
function extractJson(text: string): unknown {
  // .*? 是非貪婪比對，s 讓 . 也能匹配換行。
  const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // 先試整段就是合法 JSON 的情況。
  try {
    return JSON.parse(withoutThink);
  } catch {
    // 再試只取第一個 { 到最後一個 } 之間的內容
    //（模型有時會在 JSON 外面多說一句話）。
    const start = withoutThink.indexOf("{");
    const end = withoutThink.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(withoutThink.slice(start, end + 1));
    }
    throw new Error("模型回應不是合法的 JSON");
  }
}

// ─────────────────────────────────────────────────────────────
// 檢查並整理模型回來的資料
// ─────────────────────────────────────────────────────────────
function parseMbti(raw: unknown): {
  mbti: MbtiType;
  nickname: string;
  summary: string;
  traits: string[];
  emoji: string;
} {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("模型回應格式不正確");
  }

  const obj = raw as Record<string, unknown>;

  // mbti 必須剛好是 16 種之一（去掉空白、轉大寫後比對）。
  const mbti = String(obj.mbti ?? "").trim().toUpperCase() as MbtiType;
  if (!MBTI_TYPES.includes(mbti)) {
    throw new Error(`模型回傳了無效的 MBTI 類型：${obj.mbti}`);
  }

  return {
    mbti,
    nickname: String(obj.nickname ?? ""),
    summary: String(obj.summary ?? ""),
    // 確保 traits 一定是字串陣列。
    traits: Array.isArray(obj.traits) ? obj.traits.map((t) => String(t)) : [],
    emoji: String(obj.emoji ?? ""),
  };
}

// ─────────────────────────────────────────────────────────────
// POST handler：前端送「個性描述」進來
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  await connection();

  // API key 放在 .env.local（已加進 .gitignore，不會被 commit）。
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "伺服器尚未設定 MINIMAX_API_KEY" },
      { status: 500 }
    );
  }

  // 讀取前端送來的 JSON body。
  let body: { description?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "請求格式不正確" },
      { status: 400 }
    );
  }

  // 取出個性描述並去掉前後空白。
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (!description) {
    return Response.json(
      { ok: false, error: "請先描述一下你的個性" },
      { status: 400 }
    );
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return Response.json(
      { ok: false, error: `描述請控制在 ${MAX_DESCRIPTION_LENGTH} 字以內` },
      { status: 400 }
    );
  }

  // 建立 Anthropic client，baseURL 指向 MiniMax 的相容端點。
  const client = new Anthropic({ baseURL: BASE_URL, apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: description }],
      // 結構化輸出：模型會嚴格依照 schema 回傳 JSON。
      output_config: {
        format: {
          type: "json_schema",
          schema: MBTI_SCHEMA,
        },
      },
    });

    // response.content 是 block 的聯集，先找出文字型的 block。
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("模型沒有回傳文字內容");
    }

    // 解析並驗證。
    const result = parseMbti(extractJson(textBlock.text));

    return Response.json({ ok: true, ...result });
  } catch (error) {
    // 依錯誤類型分類回應。順序：最具體的類型在最前面。
    if (error instanceof AuthenticationError) {
      return Response.json(
        { ok: false, error: "MiniMax API 金鑰無效" },
        { status: 500 }
      );
    }

    if (error instanceof RateLimitError) {
      return Response.json(
        { ok: false, error: "請求太頻繁，請稍後再試" },
        { status: 429 }
      );
    }

    if (error instanceof APIConnectionError) {
      return Response.json(
        { ok: false, error: "無法連線到 MiniMax API" },
        { status: 502 }
      );
    }

    if (error instanceof APIError) {
      return Response.json(
        { ok: false, error: `MiniMax API 錯誤：${error.message}` },
        { status: 502 }
      );
    }

    // 解析失敗之類的其它錯誤。
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "MBTI 分析失敗",
      },
      { status: 500 }
    );
  }
}
