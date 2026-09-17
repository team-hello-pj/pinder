import { NextResponse } from 'next/server';

import { tripDayCount } from '@/lib/format';

/**
 * POST /api/route-generate — "AI 생성하기" 마법사 마지막 단계에서 사용자가 고른
 * 지역/스타일/관심사/동행/이동수단을 Gemini에 보내 방문지 목록을 추천받는다.
 * 여행 기간이 여러 날이면 날짜별로 나눠서 추천받는다.
 * GEMINI_API_KEY 환경변수가 필요하다.
 */

export const runtime = 'nodejs';

const GEMINI_MODEL = 'gemini-3.8-flash'; // Current stable GA Flash model
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MIN_PLACES_PER_DAY = 2;
const MAX_PLACES_PER_DAY = 6;
const MAX_PLACES_TOTAL = 30;

function buildSystemPreamble(dayCount: number): string {
  const minTotal = MIN_PLACES_PER_DAY * dayCount;
  const maxTotal = Math.min(MAX_PLACES_TOTAL, MAX_PLACES_PER_DAY * dayCount);
  return [
    '너는 여행 경로 추천 AI야. 사용자가 고른 지역/여행 스타일/관심사/동행/여행 기간에 맞춰',
    `실제로 존재하는 유명하고 신뢰할 수 있는 방문지를 총 ${minTotal}~${maxTotal}곳 추천해줘.`,
    dayCount > 1
      ? `이 여행은 ${dayCount}일짜리야. 방문지를 1일차부터 ${dayCount}일차까지 날짜별로 골고루 나눠서(하루에 ${MIN_PLACES_PER_DAY}~${MAX_PLACES_PER_DAY}곳 정도) 배정해.`
      : '이 여행은 당일치기(1일차)야.',
    '가장 중요한 규칙: 추천하는 모든 장소는 반드시 사용자가 지정한 지역 안에 실제로 위치해야 해.',
    '단 하나라도 다른 지역의 장소를 추천하면 안 돼. addressHint에는 그 지역명을 포함한 구체적인 위치를 적어서 확인 가능하게 해.',
    '같은 날짜(day) 안에서는 방문 순서가 이동 동선상 자연스럽도록(가까운 곳끼리 묶어서) 정해줘.',
    '반드시 지정된 JSON 형식으로만 응답해.',
    'places 필드는 배열이고, 각 항목은 name(장소명), category(예: 맛집/카페/관광/쇼핑/자연/문화/체험 중 하나),',
    `duration(예상 체류 시간, 분 단위 정수), addressHint(구/동 등 대략적인 위치 힌트), day(1~${dayCount} 사이의 정수, 몇 일차 방문지인지)를 담아.`,
  ].join(' ');
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    places: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          category: { type: 'STRING' },
          duration: { type: 'INTEGER' },
          addressHint: { type: 'STRING' },
          day: { type: 'INTEGER' },
        },
        required: ['name', 'category', 'duration', 'day'],
      },
    },
  },
  required: ['places'],
};

interface GeneratedPlace {
  name: string;
  category: string;
  duration: number;
  addressHint?: string;
  day: number;
}

interface RouteGenerateRequestBody {
  region?: string;
  style?: string;
  interests?: string[];
  companion?: string;
  tripStart?: string;
  tripEnd?: string;
}

function sanitizePlaces(raw: unknown, dayCount: number, maxTotal: number): GeneratedPlace[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (p): p is { name: unknown; category: unknown; duration: unknown; addressHint?: unknown } =>
        !!p && typeof p === 'object',
    )
    .map((p) => ({
      name: String((p as { name?: unknown }).name ?? '').slice(0, 60),
      category: String((p as { category?: unknown }).category ?? '기타').slice(0, 20),
      duration: Math.max(
        10,
        Math.min(180, Math.round(Number((p as { duration?: unknown }).duration) || 30)),
      ),
      addressHint: (p as { addressHint?: unknown }).addressHint
        ? String((p as { addressHint?: unknown }).addressHint).slice(0, 80)
        : undefined,
      day: Math.max(1, Math.min(dayCount, Math.round(Number((p as { day?: unknown }).day)) || 1)),
    }))
    .filter((p) => p.name)
    .slice(0, maxTotal);
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server is missing GEMINI_API_KEY' }, { status: 500 });
  }

  try {
    const { region, style, interests, companion, tripStart, tripEnd } = ((await request.json()) ??
      {}) as RouteGenerateRequestBody;

    const regionText = String(region ?? '').trim();
    const styleText = String(style ?? '').trim();
    const companionText = String(companion ?? '').trim();
    if (!regionText || !styleText || !companionText) {
      return NextResponse.json({ error: 'region, style, companion is required' }, { status: 400 });
    }
    const interestList = Array.isArray(interests)
      ? interests.filter((i): i is string => typeof i === 'string').slice(0, 10)
      : [];

    const dayCount = tripDayCount(tripStart ?? '', tripEnd ?? tripStart ?? '');
    const maxTotal = Math.min(MAX_PLACES_TOTAL, MAX_PLACES_PER_DAY * dayCount);

    const userPrompt = [
      `지역: ${regionText}`,
      `여행 스타일: ${styleText}`,
      `관심사: ${interestList.join(', ') || '무관'}`,
      `동행: ${companionText}`,
      `여행 기간: ${tripStart ?? ''} ~ ${tripEnd ?? tripStart ?? ''} (총 ${dayCount}일)`,
    ].join('\n');

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPreamble(dayCount) }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: Math.min(4000, 300 + maxTotal * 90),
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('================ GEMINI ERROR (route-generate) ================');
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

    let places: GeneratedPlace[] = [];
    try {
      const parsed = JSON.parse(rawText);
      places = sanitizePlaces(parsed.places, dayCount, maxTotal);
    } catch {
      places = [];
    }

    if (places.length < Math.min(MIN_PLACES_PER_DAY, dayCount)) {
      return NextResponse.json(
        { error: 'AI가 충분한 추천 장소를 만들지 못했어요' },
        { status: 502 },
      );
    }

    return NextResponse.json({ places, dayCount });
  } catch (err) {
    console.error('route-generate handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
