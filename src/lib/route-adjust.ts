'use client';

export interface AiRouteAdjustPlace {
  id: number;
  name: string;
  category: string;
  duration: number;
}

export interface AiRouteAdjustResult {
  order: number[];
  segments: string[];
  note: string;
  applied: boolean;
}

/**
 * 사용자가 직접 설명한 상황을 Gemini에 보내 방문 순서/이동수단을 다시 정한다.
 * anchorId를 주면 그 장소는 이미 도착한 현재 위치로 취급해 응답의 order 첫 자리에
 * 고정한다(그 앞의 방문지는 이미 지나갔으니 건드리지 않고, places/segments에도 애초에
 * 포함하지 않는다).
 */
export async function requestAiRouteAdjustment(
  situationText: string,
  places: AiRouteAdjustPlace[],
  segments: string[],
  anchorId?: number,
): Promise<AiRouteAdjustResult> {
  const res = await fetch('/api/route-adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ situationText, places, segments, anchorId }),
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
