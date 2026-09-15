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

/**
 * 로그인 세션 플래그. 실제 인증 백엔드가 없는 프로토타입 단계라
 * `pd-session` 값 하나(JSON 이 아닌 원시 문자열 `'1'`)로 로그인 여부만 흉내낸다.
 * TODO(인증 담당): 실제 인증 연동 시 이 세 함수만 세션/토큰 확인으로 교체하면 됨.
 */
export function setSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.session, '1');
  } catch {
    // 저장 실패해도 현재 세션에서는 로그인 상태로 계속 진행한다.
  }
}

export function isSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEYS.session) === '1';
  } catch {
    return false;
  }
}

/** 회원 탈퇴/로그아웃 시 세션 플래그를 지운다. */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.session);
  } catch {
    // 저장소 접근이 막혀도 탈퇴 흐름 자체는 계속 진행돼야 한다.
  }
}

export const storage = { read, write };
