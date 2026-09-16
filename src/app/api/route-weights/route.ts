import { NextResponse } from 'next/server';

import { callGemini } from '@/lib/server/gemini';

/**
 * POST /api/route-weights — 사용자가 선택한 "변수"(플래너의 상황 변경 값)를 Gemini 로
 * 분석해서, 최적경로 계산에 쓸 가중치(metricWeight/comfortWeight)를 만들어 준다.
 * 기존 /api/chat 과 같은 Gemini 연결(같은 키·모델)을 재사용하며, 새 AI API를 추가하지 않는다.
 */

export const runtime = 'nodejs';

interface VariableInput {
  id: string;
  label: string;
  sub?: { id: string; label: string } | null;
  severity: { id: string; label: string; weight: number };
}

interface RequestBody {
  variable: VariableInput | null;
  criteria?: 'time' | 'distance';
}

const WEIGHT_SCHEMA = {
  type: 'object',
  properties: {
    metricWeight: { type: 'number' },
    comfortWeight: { type: 'number' },
    reasoning: { type: 'string' },
  },
  required: ['metricWeight', 'comfortWeight'],
};

const FALLBACK = { metricWeight: 1, comfortWeight: 0, reasoning: '기본값(변수 없음 또는 AI 응답 실패)' };

function clampWeights(metric: unknown, comfort: unknown) {
  const m = Number(metric);
  const c = Number(comfort);
  const safeM = Number.isFinite(m) && m >= 0 ? m : 1;
  const safeC = Number.isFinite(c) && c >= 0 ? c : 0;
  const total = safeM + safeC;
  if (total <= 0) return { metricWeight: 1, comfortWeight: 0 };
  return { metricWeight: safeM / total, comfortWeight: safeC / total };
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const { variable, criteria } = body;

  const variableText = variable
    ? [
        `변수 종류: ${variable.label} (id: ${variable.id})`,
        variable.sub ? `세부 종류: ${variable.sub.label} (id: ${variable.sub.id})` : null,
        `불편도: ${variable.severity.label} (내부 가중치 ${variable.severity.weight})`,
      ]
        .filter(Boolean)
        .join('\n')
    : '사용자가 변수를 선택하지 않고 "그냥 진행"을 선택함 (기본 기준으로 진행)';

  const prompt = [
    '너는 여행 경로 최적화 서비스의 가중치 결정 엔진이다.',
    '사용자가 고른 상황 변수를 분석해서 아래 두 가중치를 0 이상 숫자로 정하라. (합이 1이 되도록 비율로 생각해도 되고, 그대로 둬도 서버에서 정규화한다)',
    '- metricWeight: 지도 API가 계산한 실제 이동 거리/시간(사실)을 얼마나 그대로 따를지',
    '- comfortWeight: 방문지 우선순위(급한 방문 우선)와 악천후 속 실외 방문지 노출 회피를 얼마나 반영해서 방문 순서를 앞뒤로 조정할지',
    '변수가 없거나 "그냥 진행"이면 metricWeight 를 크게(예: 1에 가깝게), comfortWeight 를 0에 가깝게 하라.',
    '불편도(심각도)가 높을수록 comfortWeight 를 더 높여라. 짐/기상/지연/교통 등 변수 종류에 따라 얼마나 우선순위·날씨를 반영해야 할지 스스로 판단하라.',
    criteria ? `현재 경로 계산 기준: ${criteria === 'distance' ? '최단 거리' : '최단 시간'}` : null,
    '',
    variableText,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  try {
    const result = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      temperature: 0.2,
      maxOutputTokens: 300,
      responseMimeType: 'application/json',
      responseSchema: WEIGHT_SCHEMA,
    });

    if (!result.ok || !result.text) {
      return NextResponse.json(FALLBACK);
    }

    let parsed: { metricWeight?: unknown; comfortWeight?: unknown; reasoning?: unknown };
    try {
      parsed = JSON.parse(result.text);
    } catch (err) {
      console.error('route-weights: failed to parse Gemini JSON', err, result.text);
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
