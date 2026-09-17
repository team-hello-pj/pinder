'use client';

export interface AiGeneratedPlace {
  name: string;
  category: string;
  duration: number;
  addressHint?: string;
  /** 1부터 시작하는 일차 (몇 일차 방문지인지) */
  day: number;
}

export interface RouteGenerateInput {
  region: string;
  style: string;
  interests: string[];
  companion: string;
  tripStart: string;
  tripEnd: string;
}

export interface RouteGenerateResult {
  places: AiGeneratedPlace[];
  dayCount: number;
}

/** "AI 생성하기" 마법사에서 고른 조건을 Gemini에 보내 방문지 목록을 추천받는다. */
export async function requestAiRouteGeneration(
  input: RouteGenerateInput,
): Promise<RouteGenerateResult> {
  const res = await fetch('/api/route-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? 'AI 일정을 생성하지 못했습니다.');
  return {
    places: Array.isArray(data.places) ? data.places : [],
    dayCount: Number(data.dayCount) || 1,
  };
}
