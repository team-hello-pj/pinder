import type { Priority, RouteCriteria, TransportMode } from '@/types';

export const PRIORITY_ORDER: Priority[] = ['high', 'normal', 'low'];

export const PRIORITY_MAP: Record<Priority, { label: string; bg: string; color: string }> = {
  high: { label: '급한 방문', bg: 'var(--pd-danger-bg)', color: 'var(--pd-danger)' },
  normal: { label: '보통', bg: 'var(--pd-chip-bg)', color: 'var(--pd-text-sub)' },
  low: { label: '낮음', bg: 'var(--pd-info-bg)', color: 'var(--pd-info)' },
};

export const MODE_ORDER: TransportMode[] = ['car', 'walk', 'transit', 'bike'];

export interface ModeMeta {
  label: string;
  icon: string;
  /** API 실패 시 폴백 추정에 쓰는 km 당 분 */
  minPerKm: number;
  /** 평균 대기 시간(분) */
  wait: number;
}

export const MODE_MAP: Record<TransportMode, ModeMeta> = {
  car: { label: '자동차', icon: '🚗', minPerKm: 2.0, wait: 0 },
  walk: { label: '도보', icon: '🚶', minPerKm: 12, wait: 0 },
  transit: { label: '대중교통', icon: '🚌', minPerKm: 6, wait: 4 },
  bike: { label: '자전거', icon: '🚲', minPerKm: 4.5, wait: 0 },
};

export const CRITERIA_LABEL: Record<RouteCriteria, string> = {
  time: '최단 시간',
  distance: '최단 거리',
};

export const CATEGORY_OPTIONS = [
  '카페·베이커리',
  '식당',
  '쇼핑',
  '관광명소',
  '생활서비스',
  '기타',
] as const;

/** 날씨 영향을 크게 받는 실외 카테고리 */
export const OUTDOOR_CATEGORIES = ['관광명소'];

export const SITUATION_VARS = [
  { id: 'luggage', label: '짐 추가' },
  { id: 'weather', label: '기상 변화' },
  { id: 'delay', label: '일정 지연' },
  { id: 'traffic', label: '교통 상황 악화' },
] as const;

export const WEATHER_SUBS = [
  { id: 'rain', label: '비' },
  { id: 'snow', label: '눈' },
  { id: 'typhoon', label: '태풍' },
] as const;

export const SEVERITY_LEVELS = [
  { id: 'mild', label: '조금 불편', weight: 1 },
  { id: 'normal', label: '보통', weight: 2 },
  { id: 'hard', label: '매우 불편', weight: 3 },
] as const;

export type SituationId = (typeof SITUATION_VARS)[number]['id'];
export type WeatherSubId = (typeof WEATHER_SUBS)[number]['id'];
