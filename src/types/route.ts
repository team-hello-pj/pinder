/** 경로 계획 도메인 타입. 화면/API 양쪽에서 공유한다. */

export type TransportMode = 'car' | 'walk' | 'transit' | 'bike';
export type RouteCriteria = 'time' | 'distance';
export type WeatherState = 'sunny' | 'cloudy' | 'rain' | 'snow';
export type BusinessHours = 'open' | 'closed' | 'unknown';

/** 경로에 담기는 방문지 한 곳. */
export interface Place {
  id: number;
  name: string;
  address: string;
  category: string;
  /** 체류 시간(분) */
  duration: number;
  visitTime: string;
  packItems: string;
  weather: WeatherState;
  hours: BusinessHours;
  hoursLabel: string;
  /** 지오코딩 결과 (Kakao 좌표계: x=경도, y=위도) */
  x?: number | null;
  y?: number | null;
  /** 여러 날 일정일 때 며칠차에 속하는지 (0-indexed) */
  day?: number;
  roadAddress?: string;
  jibunAddress?: string;
  placeId?: string;
}

/** 대중교통 경로의 세부 구간. Kakao 응답에 없는 값은 null 로 둔다. */
export interface TransitStep {
  type: 'WALKING' | 'SUBWAY' | 'BUS' | string | null;
  minutes: number | null;
  distanceKm: number | null;
  fromName: string | null;
  toName: string | null;
  vehicleName: string | null;
  stopCount: number | null;
}

/** /api/kakao 의 car/walk/transit/bike 가 공통으로 돌려주는 정규화된 결과. */
export interface RouteLeg {
  distanceKm: number;
  minutes: number;
  transfers: number | null;
  pathPoints: { x: number; y: number }[];
  transitSteps?: TransitStep[];
  landingURL?: string | null;
}

/** 구간 하나(이동수단+방문지쌍+기준)를 키로 캐시해 둔 조회 결과 한 건. */
export type RouteLegCacheEntry = RouteLeg | { failed: true; errorMsg: string };

/** `"${mode}_${fromPlaceId}_${toPlaceId}_${criteria}"` 를 키로 하는 구간 조회 결과 캐시. */
export type RouteLegCache = Record<string, RouteLegCacheEntry>;

/** localStorage(`rp-saved-routes`) 에 저장되는 경로 1건. */
export interface SavedRoute {
  id: string;
  title: string;
  places: Place[];
  segments: TransportMode[];
  criteria: RouteCriteria;
  tripStart: string;
  tripEnd: string;
  updatedAt: string;
  /** "경로 계산"/"경로 검색"으로 실제 조회해 둔 구간 결과. 저장 시 같이 저장해서 다시
   * 불러왔을 때 재검색 없이 그대로 쓴다. */
  routeCache?: RouteLegCache;
  /**
   * 이 일정에 관여된 사람 전체(본인 포함) — 제작자가 항상 맨 앞이고 isOwner: true(왕관 표시용),
   * 이후 참여한 순서대로 이어진다.
   */
  members?: { nickname: string; isOwner: boolean }[];
  /** 제목을 사용자가 직접 바꿨는지 — 자동 생성 제목과 구분할 때 쓴다. */
  customName?: boolean;
}

export type MemberRole = 'creator' | 'editor' | 'viewer';

export interface Member {
  id: string;
  nickname: string;
  role: MemberRole;
}
