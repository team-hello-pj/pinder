import { NextResponse } from 'next/server';

/**
 * POST /api/route-adjust — "변수 추가"에서 사용자가 직접 설명한 상황을 Gemini에 보내
 * 방문 순서와 이동수단을 다시 정하게 한다. GEMINI_API_KEY 환경변수가 필요하다.
 */

export const runtime = 'nodejs';

const GEMINI_MODEL = 'gemini-3.8-flash'; // Current stable GA Flash model
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const VALID_MODES = ['car', 'walk', 'transit', 'bike'];
const MAX_SITUATION_TEXT_LENGTH = 300;
const MAX_PLACES = 30;

const SYSTEM_PREAMBLE = [
  '너는 여행 경로 도우미야. 사용자가 설명하는 상황(부상, 폭우, 짐이 많음, 시간 부족 등)을 고려해서,',
  '주어진 방문지들의 방문 순서와 각 구간의 이동수단을 다시 정해줘.',
  '주어진 place id만 그대로 사용하고, 개수와 구성을 절대 바꾸지 마 (추가/삭제 금지, 모든 id를 정확히 한 번씩만 포함).',
  'anchorId가 주어지면 그 id는 이미 도착해서 지금 머물러 있는 현재 위치야 — order 배열의',
  '맨 첫 번째 자리에 반드시 그대로 두고, 그 뒤에 오는 나머지 장소들의 순서만 새로 정해.',
  '반드시 지정된 JSON 형식으로만 응답해.',
  'order 필드에는 새로운 방문 순서대로 place id를 배열로 나열해.',
  'segments 필드에는 순서상 인접한 두 장소 사이의 이동수단을 order 길이보다 1 적은 배열로 지정해',
  '(anchorId가 있으면 segments[0]은 anchorId에서 order[1]로 가는 구간이야).',
  '각 이동수단 값은 반드시 "car", "walk", "transit", "bike" 중 하나여야 해.',
  'note 필드에는 무엇을 어떻게, 왜 바꿨는지 한국어 한 문장으로 간단히 설명해.',
].join(' ');

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    order: { type: 'ARRAY', items: { type: 'INTEGER' } },
    segments: { type: 'ARRAY', items: { type: 'STRING' } },
    note: { type: 'STRING' },
  },
  required: ['order', 'segments', 'note'],
};

interface AdjustPlace {
  id: number;
  name: string;
  category: string;
  duration: number;
}

interface RouteAdjustRequestBody {
  situationText?: string;
  places?: AdjustPlace[];
  segments?: string[];
  /** 주어지면 이 id는 이미 도착한 현재 위치로 취급해, 응답의 order 첫 자리에 고정한다. */
  anchorId?: number;
}

function isPermutationOfIds(order: unknown, placeIds: number[]): order is number[] {
  if (!Array.isArray(order) || order.length !== placeIds.length) return false;
  const idSet = new Set(placeIds);
  const seen = new Set<number>();
  for (const v of order) {
    if (typeof v !== 'number' || !idSet.has(v) || seen.has(v)) return false;
    seen.add(v);
  }
  return true;
}

function sanitizeSegments(raw: unknown, length: number, fallback: string[]): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from({ length }, (_, i) => {
    const v = arr[i];
    return typeof v === 'string' && VALID_MODES.includes(v) ? v : (fallback[i] ?? 'car');
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server is missing GEMINI_API_KEY' }, { status: 500 });
  }

  try {
    const { situationText, places, segments, anchorId } = ((await request.json()) ??
      {}) as RouteAdjustRequestBody;

    const text = String(situationText ?? '')
      .trim()
      .slice(0, MAX_SITUATION_TEXT_LENGTH);
    if (!text) {
      return NextResponse.json({ error: 'situationText is required' }, { status: 400 });
    }
    if (!Array.isArray(places) || places.length < 2 || places.length > MAX_PLACES) {
      return NextResponse.json({ error: 'places must have 2 to 30 entries' }, { status: 400 });
    }

    const placeIds = places.map((p) => p.id);
    const originalSegments = Array.isArray(segments) ? segments : [];
    const hasAnchor = typeof anchorId === 'number' && placeIds.includes(anchorId);

    const userPrompt = [
      `상황: ${text}`,
      hasAnchor ? `현재 위치(anchorId): ${anchorId}` : null,
      '',
      '현재 방문지 목록 (JSON):',
      JSON.stringify(
        places.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          duration: p.duration,
        })),
      ),
      '',
      `현재 이동수단 (구간별): ${JSON.stringify(originalSegments)}`,
    ]
      .filter((line): line is string => line !== null)
      .join('\n');

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PREAMBLE }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('================ GEMINI ERROR (route-adjust) ================');
      console.error('Status:', geminiRes.status);
      console.error('Body:', errText);
      console.error('================================================');
      return NextResponse.json(
        { error: 'Gemini API request failed', status: geminiRes.status, detail: errText },
        { status: 502 },
      );
    }

    const data = await geminiRes.json();
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') || '';

    let order: unknown = null;
    let rawSegments: unknown = null;
    let note = '';
    try {
      const parsed = JSON.parse(rawText);
      order = parsed.order;
      rawSegments = parsed.segments;
      note = typeof parsed.note === 'string' ? parsed.note : '';
    } catch {
      // parsed 유지: order는 null로 남아 아래에서 원본 순서로 폴백한다.
    }

    // anchorId가 있는데 응답이 그걸 첫 자리에 두지 않으면, segments[0]이 무엇을 가리키는지
    // 더 이상 보장할 수 없다 — 억지로 순서를 바로잡지 않고 그냥 실패로 처리해 기존 동선을
    // 유지한다(위치를 옮기면 원래 응답의 segments 와 어긋난다).
    const anchorMismatch = hasAnchor && Array.isArray(order) && order[0] !== anchorId;
    if (!isPermutationOfIds(order, placeIds) || anchorMismatch) {
      return NextResponse.json({
        order: placeIds,
        segments: originalSegments,
        note: 'AI 응답을 해석하지 못해 기존 동선을 유지했어요.',
        applied: false,
      });
    }

    const finalSegments = sanitizeSegments(rawSegments, order.length - 1, originalSegments);

    return NextResponse.json({ order, segments: finalSegments, note, applied: true });
  } catch (err) {
    console.error('route-adjust handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
