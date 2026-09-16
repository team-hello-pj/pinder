/** 경로 계획 도메인 타입. 화면/API 양쪽에서 공유한다. */

export type TransportMode = 'car' | 'walk' | 'transit' | 'bike';
export type RouteCriteria = 'time' | 'distance';
export type Priority = 'high' | 'normal' | 'low';
export type WeatherState = 'sunny' | 'cloudy' | 'rain' | 'snow';
export type BusinessHours = 'open' | 'closed' | 'unknown';

/** 경로에 담기는 방문지 한 곳. */
export interface Place {
  id: number;
  name: string;
  address: string;
  category: string;
  priority: Priority;
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

/** 자동차/도보/자전거 경로의 구간별 도로명·안내문구 (Kakao 응답의 road/guidance 를 그대로 옮긴다). */
export interface RoadStep {
  name: string;
  distanceKm: number;
  minutes: number;
}

/** /api/kakao 의 car/walk/transit/bike 가 공통으로 돌려주는 정규화된 결과. */
export interface RouteLeg {
  distanceKm: number;
  minutes: number;
  transfers: number | null;
  pathPoints: { x: number; y: number }[];
  transitSteps?: TransitStep[];
  roadSteps?: RoadStep[];
  landingURL?: string | null;
}

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
  /** 함께 편집 중인 팀원 닉네임. legacy 의 `members` 를 그대로 옮김 (본인 제외). */
  members?: string[];
  /** 제목을 사용자가 직접 바꿨는지 — 자동 생성 제목과 구분할 때 쓴다. */
  customName?: boolean;
}

export type MemberRole = 'creator' | 'editor' | 'viewer';

export interface Member {
  id: string;
  nickname: string;
  role: MemberRole;
}
