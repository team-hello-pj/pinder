import type { Place } from '@/types';

// legacy/Route Planner App.dc.html 의 목업 데이터를 그대로 옮겼다.
// 협업 멤버/편집요청은 이제 /api/schedules/* 가 실제로 관리한다 (src/lib/schedules.ts).

export interface Member {
  id: string;
  nickname: string;
  role: 'editor' | 'viewer';
}

export interface EditRequest {
  id: string;
  nickname: string;
  time: string;
}

export const INITIAL_PLACES: Place[] = [
  {
    id: 1,
    visitTime: '',
    packItems: '',
    weather: 'sunny',
    name: '행복 베이커리 강남점',
    category: '카페·베이커리',
    address: '서울 강남구 테헤란로 152',
    priority: 'normal',
    duration: 20,
    hours: 'open',
    hoursLabel: '영업중 · 21:00 마감',
  },
  {
    id: 2,
    visitTime: '',
    packItems: '',
    weather: 'sunny',
    name: '미소 세탁소',
    category: '생활서비스',
    address: '서울 송파구 올림픽로 300',
    priority: 'normal',
    duration: 10,
    hours: 'closed',
    hoursLabel: '영업종료 · 09:00 오픈',
  },
  {
    id: 3,
    visitTime: '',
    packItems: '',
    weather: 'sunny',
    name: '그린마트 광진점',
    category: '마트·편의점',
    address: '서울 광진구 자양로 45',
    priority: 'normal',
    duration: 15,
    hours: 'open',
    hoursLabel: '영업중 · 23:00 마감',
  },
  {
    id: 4,
    visitTime: '',
    packItems: '',
    weather: 'sunny',
    name: '한빛 인쇄소',
    category: '사무·인쇄',
    address: '서울 성동구 아차산로 12',
    priority: 'low',
    duration: 25,
    hours: 'open',
    hoursLabel: '18:00 마감',
  },
];
