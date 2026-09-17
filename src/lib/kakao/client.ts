'use client';

import type { RouteLeg, TransportMode } from '@/types';

/** 브라우저에서 /api/kakao 프록시를 호출하는 얇은 래퍼. 화면 코드는 fetch 를 직접 쓰지 않는다. */

export class KakaoApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'KakaoApiError';
  }
}

async function callKakao<T>(action: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/kakao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new KakaoApiError(data?.error ?? '요청을 처리하지 못했습니다.', res.status, data?.detail);
  }
  return data as T;
}

export interface KakaoPlaceDoc {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_group_name: string;
  x: string;
  y: string;
}

export function searchKeyword(query: string, near?: { x: number; y: number; radius?: number }) {
  return callKakao<{ documents: KakaoPlaceDoc[] }>('keyword', {
    query,
    x: near?.x,
    y: near?.y,
    radius: near?.radius,
  });
}

export function geocodeAddress(query: string) {
  return callKakao<{ documents: KakaoPlaceDoc[] }>('geocode', { query });
}

export interface KakaoReverseGeocodeDoc {
  address?: { address_name: string } | null;
  road_address?: { address_name: string } | null;
}

/** 좌표(x=경도, y=위도)를 사람이 읽을 수 있는 주소로 바꾼다. "현재 위치" 표시용. */
export function reverseGeocode(x: number, y: number) {
  return callKakao<{ documents: KakaoReverseGeocodeDoc[] }>('reverseGeocode', { x, y });
}

export interface RouteRequest {
  originX: number;
  originY: number;
  destX: number;
  destY: number;
  /** 'time' | 'distance' */
  priority?: string;
}

export function fetchRouteLeg(mode: TransportMode, req: RouteRequest) {
  return callKakao<RouteLeg>(mode, req as unknown as Record<string, unknown>);
}

/** Kakao Maps JS SDK 를 한 번만 로드한다. 여러 화면에서 호출해도 중복 로드되지 않는다. */
let sdkPromise: Promise<typeof window.kakao> | null = null;

export function loadKakaoMapsSdk(): Promise<typeof window.kakao> {
  if (sdkPromise) return sdkPromise;

  sdkPromise = (async () => {
    const res = await fetch('/api/kakao-config');
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.javascriptKey) {
      throw new Error(data?.error ?? 'Kakao JS 키를 불러오지 못했습니다.');
    }

    if (window.kakao?.maps) {
      await new Promise<void>((resolve) => window.kakao.maps.load(resolve));
      return window.kakao;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${data.javascriptKey}&autoload=false`;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error('Kakao SDK 스크립트 로드 실패 (앱키/도메인 설정을 확인하세요).'));
      document.head.appendChild(script);
    });

    if (!window.kakao?.maps) throw new Error('Kakao SDK 로드 후에도 kakao.maps 가 없습니다.');
    await new Promise<void>((resolve) => window.kakao.maps.load(resolve));
    return window.kakao;
  })();

  // 실패한 Promise 를 캐시해두면 재시도가 영원히 막히므로 초기화한다.
  sdkPromise.catch(() => {
    sdkPromise = null;
  });

  return sdkPromise;
}
