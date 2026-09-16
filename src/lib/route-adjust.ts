'use client';

export interface AiRouteAdjustPlace {
  id: number;
  name: string;
  category: string;
  duration: number;
  priority: string;
}

export interface AiRouteAdjustResult {
  order: number[];
  segments: string[];
  note: string;
  applied: boolean;
}

/** 사용자가 직접 설명한 상황을 Gemini에 보내 방문 순서/이동수단을 다시 정한다. */
export async function requestAiRouteAdjustment(
  situationText: string,
  places: AiRouteAdjustPlace[],
  segments: string[],
): Promise<AiRouteAdjustResult> {
  const res = await fetch('/api/route-adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ situationText, places, segments }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? 'AI 응답을 가져오지 못했습니다.');
  return {
    order: Array.isArray(data.order) ? data.order : [],
    segments: Array.isArray(data.segments) ? data.segments : [],
    note: typeof data.note === 'string' ? data.note : '',
    applied: Boolean(data.applied),
  };
}
