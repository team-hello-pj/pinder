'use client';

import type { Place, TransportMode } from '@/types';

/** "AI 생성하기" 마법사 결과를 플래너 페이지로 넘길 때 쓰는 세션 저장소 키. */
const STORAGE_KEY = 'pinder-ai-generated-route';

export interface AiRouteHandoff {
  places: Place[];
  segments: TransportMode[];
}

export function saveAiRouteHandoff(payload: AiRouteHandoff) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // 세션 저장소를 못 쓰는 환경(프라이빗 모드 등)이면 그냥 무시한다.
  }
}

/** 저장된 핸드오프 데이터를 한 번 읽고 즉시 지운다 (재방문 시 중복 적용 방지). */
export function consumeAiRouteHandoff(): AiRouteHandoff | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.places) || !Array.isArray(parsed?.segments)) return null;
    return parsed as AiRouteHandoff;
  } catch {
    return null;
  }
}
