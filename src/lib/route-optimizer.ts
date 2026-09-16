/**
 * 방문지 좌표(x=경도, y=위도) 기반 "출발지 고정, 귀환 없음" 방문 순서 최적화.
 *
 * 여기서 계산하는 것은 순서(방문 순서)뿐이다. 실제 구간별 거리/시간은
 * 기존 Kakao 경로 API(`fetchRouteLeg`)로 조회한 값을 그대로 쓰고,
 * "얼마나 지도 실측값을 그대로 따를지(metricWeight) vs 얼마나 날씨에 취약한
 * 실외 방문지를 뒤로 미루는 식으로 변수를 반영할지(comfortWeight)"는 Gemini가
 * 변수를 분석해 만든 가중치를 그대로 받아서 쓴다. 가중치를 이 파일에 고정값으로 두지 않는다.
 */

import { OUTDOOR_CATEGORIES } from '@/constants';
import type { Place } from '@/types';

export interface OptimalRouteResult {
  /** 출발지가 0번째로 고정된 방문 순서(장소 id 배열) */
  placeIds: number[];
  totalDistanceKm: number;
  totalMinutes: number;
}

export interface RouteWeights {
  /** 지도 API 실측 거리/시간을 그대로 따르는 비중 (0~1) */
  metricWeight: number;
  /** 날씨에 취약한 실외 방문지 회피 같은 변수 기반 사정을 반영하는 비중 (0~1) */
  comfortWeight: number;
  reasoning?: string;
}

export interface RouteOptimizationState {
  /** 이 결과가 어떤 (출발지, 목적지 구성, 변수)에 대해 계산됐는지 식별하는 값 */
  signature: string;
  originId: number;
  weights: RouteWeights;
  distance: OptimalRouteResult;
  time: OptimalRouteResult;
}

/**
 * 출발지 + 목적지 구성(id·좌표) + 선택된 변수가 바뀌면 값이 달라지는 식별자.
 * 재계산 여부 판단에 쓴다(경로 기준(criteria)은 포함하지 않는다 — 최단거리/최단시간
 * 결과를 한 번에 같이 계산해 두고 기준 전환 시에는 그중 하나를 그대로 보여주기 때문).
 */
export function buildRouteSignature(
  originId: number,
  places: { id: number; x?: number | null; y?: number | null }[],
  variableKey: string,
): string {
  const parts = places.map((p) => `${p.id}:${p.x ?? ''}:${p.y ?? ''}`).sort();
  return `${originId}|${variableKey}|${parts.join(',')}`;
}

/** 좌표 간 대권 거리(km). 실제 경로 API 호출이 실패했을 때만 대체값으로 쓴다. */
export function haversineKm(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const R = 6371;
  const dLat = ((b.y - a.y) * Math.PI) / 180;
  const dLng = ((b.x - a.x) * Math.PI) / 180;
  const lat1 = (a.y * Math.PI) / 180;
  const lat2 = (b.y * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

/**
 * "늦게 방문할수록 나쁜 정도"(0~1). 현재 데이터 구조에서 실제로 쓸 수 있는 신호인
 * 악천후 속 실외 방문지 노출만 반영한다(기존 route-engine.ts 의 OUTDOOR_CATEGORIES 재사용).
 */
export function computeDelayCost(place: Place): number {
  const isBadWeatherNow = place.weather === 'rain' || place.weather === 'snow';
  return isBadWeatherNow && OUTDOOR_CATEGORIES.includes(place.category) ? 1 : 0;
}

/**
 * 0번 노드(출발지)를 고정한 채 나머지를 한 번씩 방문하는 경로를 구한다.
 * 목적함수 = metricWeight * (지도 실측 비용 합) + comfortWeight * (지연비용 가중 합).
 * 지연비용 가중 합은 "늦게 방문할수록 delayCost 가 큰 곳에 패널티"를 주는 항이라
 * comfortWeight 가 클수록 날씨에 취약한 방문지가 뒤로 밀린다.
 * comfortWeight 가 0이면 순수하게 지도 실측 비용(baseCost)만 최소화하는 경로와 같다.
 */
export function solveWeightedOpenPathOrder(
  baseCost: number[][],
  delayCost: number[],
  metricWeight: number,
  comfortWeight: number,
): number[] {
  const n = baseCost.length;
  if (n <= 1) return Array.from({ length: n }, (_, i) => i);

  const offDiagonal: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) offDiagonal.push(baseCost[i][j]);
    }
  }
  const avgEdgeCost = offDiagonal.length > 0 ? offDiagonal.reduce((a, b) => a + b, 0) / offDiagonal.length : 1;
  const positionUnit = comfortWeight * avgEdgeCost;

  const totalCost = (path: number[]): number => {
    let metric = 0;
    for (let i = 0; i < path.length - 1; i++) metric += baseCost[path[i]][path[i + 1]];
    let delay = 0;
    for (let i = 0; i < path.length; i++) delay += i * delayCost[path[i]];
    return metricWeight * metric + positionUnit * delay;
  };

  const visited = new Array(n).fill(false);
  visited[0] = true;
  let path = [0];
  for (let step = 1; step < n; step++) {
    const last = path[path.length - 1];
    let best = -1;
    let bestScore = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited[j]) continue;
      const score = metricWeight * baseCost[last][j] + positionUnit * step * delayCost[j];
      if (score < bestScore) {
        bestScore = score;
        best = j;
      }
    }
    path.push(best);
    visited[best] = true;
  }

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const candidate = [...path.slice(0, i), ...path.slice(i, k + 1).reverse(), ...path.slice(k + 1)];
        if (totalCost(candidate) < totalCost(path) - 1e-9) {
          path = candidate;
          improved = true;
        }
      }
    }
  }
  return path;
}

export function sumPathCost(order: number[], costMatrix: number[][]): number {
  let total = 0;
  for (let i = 0; i < order.length - 1; i++) total += costMatrix[order[i]][order[i + 1]];
  return total;
}
