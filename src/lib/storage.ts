'use client';

/**
 * localStorage 접근을 한 곳에 모은다.
 * 키 문자열을 화면 코드에 직접 쓰지 말고 반드시 이 모듈을 거칠 것 (레거시와 키 호환 유지).
 */

import { useSyncExternalStore } from 'react';

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

export const storage = { read, write };

function subscribeToStorageEvents(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSessionSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.session) === '1';
  } catch {
    return false;
  }
}

/**
 * 로그인 여부. 값은 JSON 이 아니라 레거시와 동일하게 순수 문자열 `'1'` 로 저장한다.
 * 인증 연동(AuthForm.tsx 의 TODO)이 이 키를 세팅하면 헤더가 자동으로 반응한다.
 */
export function useLoggedIn(): boolean {
  return useSyncExternalStore(subscribeToStorageEvents, getSessionSnapshot, () => false);
}
