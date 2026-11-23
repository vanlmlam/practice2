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
- S/N（實感／直覺)： 關注具體事實還是抽象概念、重視實務還是可能性
- T/F（思考／情感)： 做決定時依據邏輯還是價值觀與他人感受
- J/P（判斷／感知)： 喜歡計畫與秩序，還是保持彈性隨機應變

輸出格式（非常重要，欄位名必須完全照抄）：
只輸出一個 JSON 物件，不要有任何其他文字、說明或 Markdown 程式碼區塊。欄位如下：

{
  "mbti": "四個字母的 MBTI 類型，必須是 INTJ, INTP, ENTJ, ENTP, INFJ, INFP, ENFJ, ENFP, ISTJ, ISFJ, ESTJ, ESFJ, ISTP, ISFP, ESTP, ESFP 其中之一",
  "nickname": "簡短的中文暱稱，不要出現在 MBTI 類型名稱本身",
  "summary": "用 2-3 句話描述這個個性特徵與行為模式",
  "traits": ["特質形容詞1", "特質形容詞2", "特質形容詞3"],
  "emoji": "一個最能代表這個類型的 emoji"
}

其它規則：
- 所有文字使用繁體中文
- traits 給 3 到 5 個特質形容詞
- "mbti" 這個欄位名必須寫成小寫的 mbti，不要寫成 MBTI 或其它名字`;

// ─────────────────────────────────────────────────────────────
// 結構化輸出的 JSON Schema
// ─────────────────────────────────────────────────────────────
// 交給 output_config.format。
// 注意：MiniMax 的 Anthropic 相容端點目前「接受但不完全強制」這個 schema
// （回 200，卻可能回傳 schema 外的欄位），所以真正的保險是上面 prompt 裡
// 明寫的欄位格式，加上下面 parseMbti() 的容錯解析。
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
// 模型有時會自己改欄位名（實測曾回 "MBTI" 而不是 "mbti"，
// 也會用中文欄位名），所以每個欄位都準備幾個常見別名。
const FIELD_ALIASES = {
  mbti: ["mbti", "MBTI", "type", "mbtiType", "類型", "性格類型"],
  nickname: ["nickname", "name", "title", "暱稱", "綽號"],
  summary: ["summary", "analysis", "description", "personality", "分析", "描述"],
  traits: ["traits", "keywords", "tags", "features", "特質", "特點"],
  emoji: ["emoji", "icon", "symbol", "符號"],
} as const;

// 依序嘗試別名，取第一個有值的欄位。
function pick(
  obj: Record<string, unknown>,
  keys: readonly string[]
): unknown {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

// 從任意文字裡找出有效的 MBTI 類型。
// 例如 "ISTJ"、"MBTI 類型：ISTJ（守護者）" 都能抓出來。
// 會掃過所有 4 字母片段，所以像 "MBTI" 這種無效值會被略過。
function normalizeMbti(value: unknown): MbtiType | null {
  const text = String(value ?? "").toUpperCase();

  for (const match of text.matchAll(/\b[A-Z]{4}\b/g)) {
    const candidate = match[0] as MbtiType;
    if (MBTI_TYPES.includes(candidate)) {
      return candidate;
    }
  }
  return null;
}

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

  // mbti 必須是 16 種之一。模型寫 "ISTJ"、"MBTI: ISTJ" 都能解析。
  const mbti = normalizeMbti(pick(obj, FIELD_ALIASES.mbti));
  if (!mbti) {
    throw new Error(
      `模型回傳的資料裡找不到 MBTI 類型（收到的欄位：${Object.keys(obj).join(", ") || "無"}）`
    );
  }

  // nickname / summary / emoji 都當成文字處理。
  const nickname = String(pick(obj, FIELD_ALIASES.nickname) ?? "");
  const summary = String(pick(obj, FIELD_ALIASES.summary) ?? "");
  const emoji = String(pick(obj, FIELD_ALIASES.emoji) ?? "");

  // traits 可能是字串陣列，也可能是用逗號分隔的字串，兩種都收。
  const rawTraits = pick(obj, FIELD_ALIASES.traits);
  const traits = Array.isArray(rawTraits)
    ? rawTraits.map((t) => String(t)).filter(Boolean)
    : typeof rawTraits === "string"
      ? rawTraits
          .split(/[,，、]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  return { mbti, nickname, summary, traits, emoji };
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
      {
        ok: false,
        error:
          "伺服器尚未設定 MINIMAX_API_KEY。請確認專案根目錄的 .env.local 有這一行，" +
          "並重啟 dev server（改 .env.local 後必須重啟才會生效）。",
      },
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
