import { NextResponse } from 'next/server';

/**
 * POST /api/route-weights — "변수 추가"에서 사용자가 고른/입력한 상황을 Gemini로 분석해서,
 * 최적경로 계산에 쓸 가중치(metricWeight/comfortWeight)를 만들어 준다.
 * /api/route-adjust 와 같은 Gemini 연결(같은 키·모델)을 그대로 재사용하며, 새 AI API를 추가하지 않는다.
 */

export const runtime = 'nodejs';

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_FREE_TEXT_LENGTH = 300;

interface VariableInput {
  id: string;
  label: string;
  freeText?: string;
  sub?: { id: string; label: string } | null;
  severity?: { id: string; label: string; weight: number } | null;
}

interface RequestBody {
  variable: VariableInput | null;
  criteria?: 'time' | 'distance';
}

const SYSTEM_PREAMBLE = [
  '너는 여행 경로 최적화 서비스의 가중치 결정 엔진이다.',
  '사용자가 고른 상황 변수를 분석해서 아래 두 가중치를 정하라.',
  '- metricWeight: 지도 API가 계산한 실제 이동 거리/시간을 얼마나 그대로 따를지',
  '- comfortWeight: 악천후에 취약한 실외 방문지를 뒤로 미루는 식으로 변수를 얼마나 반영할지',
  '두 값은 0 이상이어야 하고, 서버에서 합이 1이 되도록 정규화하니 비율만 맞으면 된다.',
  '변수가 없거나 상황이 가벼우면 metricWeight 를 크게(예: 1에 가깝게), comfortWeight 를 0에 가깝게 하라.',
  '불편도(심각도)가 높을수록, 혹은 자유 설명에서 상황이 심각할수록 comfortWeight 를 더 높여라.',
  '반드시 지정된 JSON 형식으로만 응답해.',
].join(' ');

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    metricWeight: { type: 'NUMBER' },
    comfortWeight: { type: 'NUMBER' },
    reasoning: { type: 'STRING' },
  },
  required: ['metricWeight', 'comfortWeight'],
};

const FALLBACK = {
  metricWeight: 1,
  comfortWeight: 0,
  reasoning: '기본값(변수 없음 또는 AI 응답 실패)',
};

function clampWeights(metric: unknown, comfort: unknown) {
  const m = Number(metric);
  const c = Number(comfort);
  const safeM = Number.isFinite(m) && m >= 0 ? m : 1;
  const safeC = Number.isFinite(c) && c >= 0 ? c : 0;
  const total = safeM + safeC;
  if (total <= 0) return { metricWeight: 1, comfortWeight: 0 };
  return { metricWeight: safeM / total, comfortWeight: safeC / total };
}

function describeVariable(variable: VariableInput | null, criteria?: string): string {
  const lines: string[] = [];
  if (criteria)
    lines.push(`현재 경로 계산 기준: ${criteria === 'distance' ? '최단 거리' : '최단 시간'}`);
  if (!variable) {
    lines.push('사용자가 변수를 선택하지 않고 "그냥 진행"을 선택함 (기본 기준으로 진행)');
    return lines.join('\n');
  }
  if (variable.freeText) {
    lines.push(`사용자가 자유 텍스트로 설명한 상황: ${variable.freeText}`);
    return lines.join('\n');
  }
  lines.push(`변수 종류: ${variable.label} (id: ${variable.id})`);
  if (variable.sub) lines.push(`세부 종류: ${variable.sub.label} (id: ${variable.sub.id})`);
  if (variable.severity)
    lines.push(`불편도: ${variable.severity.label} (내부 가중치 ${variable.severity.weight})`);
  return lines.join('\n');
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(FALLBACK);
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const variable = body.variable
    ? { ...body.variable, freeText: body.variable.freeText?.slice(0, MAX_FREE_TEXT_LENGTH) }
    : null;
  const userPrompt = describeVariable(variable, body.criteria);

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PREAMBLE }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 300,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('================ GEMINI ERROR (route-weights) ================');
      console.error('Status:', geminiRes.status);
      console.error('Body:', errText);
      console.error('================================================');
      return NextResponse.json(FALLBACK);
    }

    const data = await geminiRes.json();
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') || '';

    let parsed: { metricWeight?: unknown; comfortWeight?: unknown; reasoning?: unknown } = {};
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      console.error('route-weights: failed to parse Gemini JSON', err, rawText);
      return NextResponse.json(FALLBACK);
    }

    const { metricWeight, comfortWeight } = clampWeights(parsed.metricWeight, parsed.comfortWeight);
    const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '';
    return NextResponse.json({ metricWeight, comfortWeight, reasoning });
  } catch (err) {
    console.error('route-weights handler error:', err);
    return NextResponse.json(FALLBACK);
  }
}
