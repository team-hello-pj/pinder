'use client';

import type { RouteWeights } from '@/lib/route-optimizer';

/** 플래너에서 선택/입력한 "변수"를 서버(/api/route-weights)로 보내기 위한 형태. */
export interface RouteVariableInput {
  id: string;
  label: string;
  freeText?: string;
  sub?: { id: string; label: string } | null;
  severity?: { id: string; label: string; weight: number } | null;
}

const FALLBACK_WEIGHTS: RouteWeights = { metricWeight: 1, comfortWeight: 0 };

/** Gemini 로 변수를 분석해 경로 계산용 가중치를 받아온다. 실패하면 안전한 기본값을 돌려준다. */
export async function fetchRouteWeights(
  variable: RouteVariableInput | null,
  criteria: 'time' | 'distance',
): Promise<RouteWeights> {
  try {
    const res = await fetch('/api/route-weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variable, criteria }),
    });
    const data = await res.json().catch(() => null);
    if (!data || typeof data.metricWeight !== 'number' || typeof data.comfortWeight !== 'number') {
      return FALLBACK_WEIGHTS;
    }
    return data as RouteWeights;
  } catch (err) {
    console.error('fetchRouteWeights failed:', err);
    return FALLBACK_WEIGHTS;
  }
}
