import 'server-only';

/**
 * Gemini generateContent 단일 호출 래퍼. 서버 전용이며 GEMINI_API_KEY 는
 * 이 파일에서만 읽는다. /api/chat, /api/route-weights 가 함께 재사용한다.
 */

const GEMINI_MODEL = 'gemini-3.8-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiCallOptions {
  contents: GeminiContent[];
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** 구조화된 응답이 필요할 때 'application/json' */
  responseMimeType?: string;
  /** responseMimeType 이 'application/json' 일 때 응답 형태를 강제하는 스키마 */
  responseSchema?: unknown;
}

export interface GeminiCallResult {
  ok: boolean;
  status: number;
  /** 후보 응답의 텍스트를 이어붙인 값. 실패 시 null. */
  text: string | null;
  raw: unknown;
}

export async function callGemini(options: GeminiCallOptions): Promise<GeminiCallResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      text: null,
      raw: { error: 'Server is missing GEMINI_API_KEY' },
    };
  }

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxOutputTokens ?? 1000,
  };
  if (options.responseMimeType) generationConfig.responseMimeType = options.responseMimeType;
  if (options.responseSchema) generationConfig.responseSchema = options.responseSchema;

  const body: Record<string, unknown> = {
    contents: options.contents,
    generationConfig,
  };
  if (options.systemInstruction) {
    body.system_instruction = { parts: [{ text: options.systemInstruction }] };
  }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    console.error('Gemini API error', res.status, raw);
    return { ok: false, status: res.status, text: null, raw };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const text: string | null =
    (raw as any)?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? '')
      .join('') ?? null;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return { ok: true, status: res.status, text, raw };
}
