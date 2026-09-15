'use client';

/**
 * localStorage 접근을 한 곳에 모은다.
 * 키 문자열을 화면 코드에 직접 쓰지 말고 반드시 이 모듈을 거칠 것 (레거시와 키 호환 유지).
 */

import type { SavedRoute } from '@/types';

export const STORAGE_KEYS = {
  theme: 'pd-theme',
  savedRoutes: 'rp-saved-routes',
  savedId: 'pd-saved-id',
  users: 'pnder-users',
  aiHandoff: 'pd-ai-handoff',
  session: 'pd-session',
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

export function loadSavedRoutes(): SavedRoute[] {
  return read<SavedRoute[]>(STORAGE_KEYS.savedRoutes, []);
}

export function saveRoutes(routes: SavedRoute[]): void {
  write(STORAGE_KEYS.savedRoutes, routes);
}

export function upsertRoute(route: SavedRoute): SavedRoute[] {
  const routes = loadSavedRoutes();
  const idx = routes.findIndex((r) => r.id === route.id);
  if (idx >= 0) routes[idx] = route;
  else routes.unshift(route);
  saveRoutes(routes);
  return routes;
}

export function removeRoute(id: string): SavedRoute[] {
  const routes = loadSavedRoutes().filter((r) => r.id !== id);
  saveRoutes(routes);
  return routes;
}

/** 회원 탈퇴 시 세션 플래그를 지운다. */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.session);
  } catch {
    // 저장소 접근이 막혀도 탈퇴 흐름 자체는 계속 진행돼야 한다.
  }
}

export const storage = { read, write };
