'use client';

/**
 * localStorage 접근을 한 곳에 모은다.
 * 키 문자열을 화면 코드에 직접 쓰지 말고 반드시 이 모듈을 거칠 것 (레거시와 키 호환 유지).
 * 경로/일정 저장은 `@/lib/schedules` (서버 API) 로 옮겨갔다 — 여기 남은 건 순수 UI 로컬 상태뿐.
 */

export const STORAGE_KEYS = {
  theme: 'pd-theme',
  savedId: 'pd-saved-id',
  aiHandoff: 'pd-ai-handoff',
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 사생활 보호 모드 등에서 저장이 막힐 수 있다. 화면은 계속 동작해야 한다.
  }
}

export const storage = { read, write };
