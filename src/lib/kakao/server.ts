import 'server-only';

import type { RoadStep, RouteLeg, TransitStep } from '@/types';

/**
 * Kakao REST 호출 + 응답 정규화. 서버 전용 모듈이다.
 * car/walk/transit/bike 응답을 모두 RouteLeg 한 가지 형태로 맞춰 주기 때문에
 * 프론트엔드는 이동수단별 응답 차이를 알 필요가 없다.
 */

export const LOCAL_BASE = 'https://dapi.kakao.com';
export const MOBILITY_BASE = 'https://apis-navi.kakaomobility.com';

export interface KakaoResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
}

export async function kakaoGet<T = unknown>(
  url: string,
  params: Record<string, string | number | undefined | null>,
): Promise<KakaoResponse<T>> {
  const u = new URL(url);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  });

  const res = await fetch(u, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => null)) as T | null;
  return { ok: res.ok, status: res.status, data };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function pickLandingUrl(data: any, route: any): string | null {
  return data?.landingUrl ?? data?.landingURL ?? route?.landingUrl ?? route?.landingURL ?? null;
}

/** 연속된 동일 도로명은 하나로 합쳐서, 너무 잘게 쪼개진 구간 목록이 되지 않게 한다. */
function pushRoadStep(roadSteps: RoadStep[], name: string, distanceKm: number, minutes: number) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const last = roadSteps[roadSteps.length - 1];
  if (last && last.name === trimmed) {
    last.distanceKm += distanceKm;
    last.minutes += minutes;
    return;
  }
  roadSteps.push({ name: trimmed, distanceKm, minutes });
}

/** Kakao Navi(자동차): routes[0].summary.{distance(m), duration(s)}, sections[].roads[].{name,vertexes} */
export function parseCarRoute(data: any): RouteLeg | null {
  const route = data?.routes?.[0];
  if (!route?.summary) return null;

  const pathPoints: { x: number; y: number }[] = [];
  const roadSteps: RoadStep[] = [];
  (route.sections ?? []).forEach((sec: any) =>
    (sec.roads ?? []).forEach((road: any) => {
      const v: number[] = road.vertexes ?? [];
      for (let i = 0; i < v.length; i += 2) pathPoints.push({ x: v[i], y: v[i + 1] });
      pushRoadStep(
        roadSteps,
        road.name ?? '',
        (road.distance ?? 0) / 1000,
        (road.duration ?? 0) / 60,
      );
    }),
  );

  return {
    distanceKm: route.summary.distance / 1000,
    minutes: Math.round(route.summary.duration / 60),
    transfers: null,
    pathPoints,
    roadSteps: roadSteps.map((s) => ({ ...s, minutes: Math.round(s.minutes) })),
    landingURL: pickLandingUrl(data, route),
  };
}

/** 도보/자전거: route.properties.{totalDistance(m), totalTime(s)}, legs[].steps[].{properties.guidance,path.points} */
export function parseLegBasedRoute(data: any): RouteLeg | null {
  const route = data?.routes?.[0] ?? data?.route ?? data;
  const props = route?.properties;
  if (!props) return null;

  const pathPoints: { x: number; y: number }[] = [];
  const roadSteps: RoadStep[] = [];
  (route.legs ?? []).forEach((leg: any) =>
    (leg.steps ?? []).forEach((step: any) => {
      (step.path?.points ?? []).forEach((pt: number[]) => pathPoints.push({ x: pt[0], y: pt[1] }));
      const sp = step.properties ?? {};
      roadSteps.push({
        name: String(sp.guidance ?? '').trim(),
        distanceKm: (sp.distance ?? 0) / 1000,
        minutes: Math.round((sp.time ?? 0) / 60),
      });
    }),
  );

  return {
    distanceKm: props.totalDistance / 1000,
    minutes: Math.round(props.totalTime / 60),
    transfers: null,
    pathPoints,
    roadSteps: roadSteps.filter((s) => s.name),
    landingURL: pickLandingUrl(data, route),
  };
}

function normalizeStepType(rawType: unknown): TransitStep['type'] {
  if (rawType == null) return null;
  const s = String(rawType);
  if (/walk|foot/i.test(s)) return 'WALKING';
  if (/subway|rail|metro|train/i.test(s)) return 'SUBWAY';
  if (/bus/i.test(s)) return 'BUS';
  return s.toUpperCase();
}

/**
 * 대중교통. 응답에 없는 값은 null 로 두고 절대 지어내지 않는다.
 * 후보가 여러 개면 criteria(time|distance) 기준으로 실제 totalTime/totalDistance 를 비교해 고른다.
 */
export function parseTransitRoute(data: any, criteria?: string): RouteLeg | null {
  const routes: any[] = Array.isArray(data?.routes)
    ? data.routes
    : data?.route
      ? [data.route]
      : data
        ? [data]
        : [];

  if (routes.length === 0) {
    console.error('kakao transit parse: no routes in response');
    return null;
  }

  let route = routes[0];
  if (routes.length > 1) {
    const withTotals = routes
      .map((rt) => ({ rt, t: rt?.properties?.totalTime, d: rt?.properties?.totalDistance }))
      .filter((x) => x.t != null && x.d != null);
    if (withTotals.length > 0) {
      route =
        criteria === 'distance'
          ? withTotals.reduce((best, cur) => (cur.d < best.d ? cur : best)).rt
          : withTotals.reduce((best, cur) => (cur.t < best.t ? cur : best)).rt;
    }
  }

  const props = route?.properties;
  if (!props) {
    console.error('kakao transit parse: no properties in route');
    return null;
  }

  const pathPoints: { x: number; y: number }[] = [];
  const transitSteps: TransitStep[] = [];

  const steps: any[] = Array.isArray(route.steps) ? route.steps : [];
  steps.forEach((step) => {
    const p = step.properties ?? {};
    (step.path?.points ?? []).forEach((pt: number[]) => {
      if (Array.isArray(pt)) pathPoints.push({ x: pt[0], y: pt[1] });
    });

    const stops: any[] = Array.isArray(p.stops) ? p.stops : [];
    const vehicle = Array.isArray(p.vehicles) && p.vehicles.length > 0 ? p.vehicles[0] : null;

    transitSteps.push({
      type: normalizeStepType(p.type),
      minutes: p.time != null ? Math.round(p.time / 60) : null,
      distanceKm: p.distance != null ? p.distance / 1000 : null,
      fromName: stops[0]?.name ?? p.start?.name ?? null,
      toName: stops[stops.length - 1]?.name ?? p.end?.name ?? null,
      vehicleName: vehicle?.name ?? vehicle?.no ?? p.guidance ?? null,
      stopCount: stops.length > 0 ? stops.length : null,
    });
  });

  const totalDistanceRaw =
    props.totalDistance ?? props.distance ?? props.total_distance ?? route.distance ?? null;
  const totalTimeRaw = props.totalTime ?? props.time ?? props.total_time ?? route.duration ?? null;

  if (totalDistanceRaw == null) console.error('kakao transit parse: no total distance field');
  if (totalTimeRaw == null) console.error('kakao transit parse: no total time field');

  return {
    distanceKm: totalDistanceRaw != null ? totalDistanceRaw / 1000 : 0,
    minutes: totalTimeRaw != null ? Math.round(totalTimeRaw / 60) : 0,
    transfers: props.transferCount ?? props.transferCnt ?? null,
    pathPoints,
    transitSteps,
    landingURL: pickLandingUrl(data, route),
  };
}
