import { MODE_MAP } from '@/constants';
import type { TransportMode } from '@/types';

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
