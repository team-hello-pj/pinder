import { MODE_MAP, OUTDOOR_CATEGORIES } from '@/constants';
import type { Place, TransportMode } from '@/types';

/**
 * 규칙 기반 경로 재조정 엔진.
 *
 * 레거시 프로토타입(legacy/Route Planner App.dc.html)의 MOCK 로직을 그대로 옮겼다.
 * 실제 서비스에서는 이 파일의 함수 본문만 지도/날씨/교통 API 기반 로직으로 교체하면 되고,
 * 호출하는 화면 코드는 건드릴 필요가 없다. 입출력 형태를 바꾸지 말 것.
 */

export interface AdjustResult {
  places: Place[];
  segments: TransportMode[];
}

/** "상황 변경" 모달에서 고른 조건에 따라 방문 순서와 이동수단을 다시 계산한다. */
export function applySituationAdjustment(
  situation: string,
  sub: string | null,
  severityWeight: number,
  places: Place[],
  segments: TransportMode[],
): AdjustResult {
  let newPlaces = [...places];
  let newSegments = [...segments];

  const toTransitIf = (modes: TransportMode[]): TransportMode[] =>
    newSegments.map((m) => (modes.includes(m) ? 'transit' : m));

  if (situation === 'luggage') {
    if (severityWeight >= 3) newSegments = newSegments.map(() => 'car');
    else if (severityWeight === 2) newSegments = toTransitIf(['walk', 'bike']);
    else newSegments = newSegments.map((m) => (m === 'walk' ? 'transit' : m));
  } else if (situation === 'weather') {
    if (sub === 'typhoon' && severityWeight >= 3) {
      // 태풍 + 매우 불편: 실외 방문지를 뒤로 미루고 전 구간을 대중교통으로 바꾼다.
      const indexed = newPlaces.map((p, i) => ({ p, i }));
      indexed.sort((a, b) => {
        const oa = OUTDOOR_CATEGORIES.includes(a.p.category) ? 1 : 0;
        const ob = OUTDOOR_CATEGORIES.includes(b.p.category) ? 1 : 0;
        if (oa !== ob) return oa - ob;
        return a.i - b.i;
      });
      newPlaces = indexed.map((x) => x.p);
      newSegments = new Array(Math.max(0, newPlaces.length - 1)).fill('transit');
    } else if (severityWeight >= 2) {
      newSegments = toTransitIf(['walk', 'bike']);
    } else {
      newSegments = toTransitIf(['bike']);
    }
  } else if (situation === 'delay') {
    // 지연: 심하면 체류 시간을 줄인다.
    if (severityWeight >= 2) {
      const factor = severityWeight === 3 ? 0.6 : 0.8;
      newPlaces = newPlaces.map((p) => ({
        ...p,
        duration: Math.max(5, Math.round(p.duration * factor)),
      }));
    }
    newSegments = new Array(Math.max(0, newPlaces.length - 1)).fill(segments[0] ?? 'car');
  } else if (situation === 'traffic') {
    if (severityWeight >= 2) newSegments = toTransitIf(['car']);
  }

  return { places: newPlaces, segments: newSegments };
}

// 실제 대중교통/경로 API 좌표가 없는 구간(데모용/미리보기 방문지)에서만 쓰는 예시 데이터.
// 실제 좌표가 있으면 이 값 대신 fetchRouteLeg() 로 받은 실제 Kakao 응답을 쓴다.
const STOP_NAMES = [
  '을지대입구 정류장',
  '시청역 3번 출구',
  '종합운동장 정류장',
  '상록수역 2번 출구',
  '시민공원 정류장',
];
const LINE_NAMES = ['452번 버스', '2호선 지하철', '730번 버스', '수인분당선'];

export interface MockStep {
  mode: TransportMode;
  arrowLabel: string;
  minutes: number;
  distanceKm: number;
  nodeLabel: string | null;
}

/** MOCK: 실제 대중교통/경로 API 연동 시 이 함수만 교체하면 됨 (동일한 steps 구조로 반환) */
export function computeMockSteps(mode: TransportMode, distanceKm: number, idx: number): MockStep[] {
  const info = MODE_MAP[mode];
  if (mode !== 'transit') {
    return [
      {
        mode,
        arrowLabel: info.label,
        minutes: Math.round(distanceKm * info.minPerKm),
        distanceKm,
        nodeLabel: null,
      },
    ];
  }
  const rideDist = Math.max(0.3, distanceKm - 0.45);
  const line = LINE_NAMES[idx % LINE_NAMES.length];
  return [
    {
      mode: 'walk',
      arrowLabel: '도보',
      minutes: 3,
      distanceKm: 0.2,
      nodeLabel: STOP_NAMES[idx % STOP_NAMES.length],
    },
    {
      mode: 'transit',
      arrowLabel: line.includes('버스') ? '버스' : '지하철',
      minutes: Math.round(rideDist * info.minPerKm),
      distanceKm: rideDist,
      nodeLabel: line,
    },
    { mode: 'walk', arrowLabel: '도보', minutes: 4, distanceKm: 0.25, nodeLabel: null },
  ];
}

export const SEGMENT_DISTANCES = [3.2, 5.6, 4.1, 2.8, 6.0, 3.9, 4.7];
