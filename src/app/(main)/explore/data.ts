// legacy/Explore Destinations.dc.html 의 REGION_COORDS 를 그대로 옮겼다.
// 여행지 목록(SECTIONS)은 이제 destinations 테이블에서 온다 (@/lib/destinations, /api/explore/destinations).
// 지도 위 지역 핀 좌표는 순수 UI 데이터라 여기 그대로 둔다.

export interface RegionPin {
  key: string;
  /** korea-map.svg 위 퍼센트 좌표 */
  left: number;
  top: number;
}

const REGION_COORDS: Record<string, { left: number; top: number }> = {
  서울: { left: 29, top: 18 },
  인천: { left: 15, top: 25 },
  경기: { left: 26, top: 33 },
  강원: { left: 62, top: 16 },
  세종: { left: 35, top: 42 },
  대전: { left: 40, top: 47 },
  충북: { left: 47, top: 42 },
  충남: { left: 21, top: 46 },
  경북: { left: 68, top: 36 },
  대구: { left: 55, top: 56 },
  전북: { left: 28, top: 56 },
  경남: { left: 52, top: 66 },
  울산: { left: 72, top: 60 },
  부산: { left: 67, top: 71 },
  광주: { left: 22, top: 66 },
  전남: { left: 24, top: 79 },
  제주: { left: 27, top: 97 },
};

const REGION_ORDER = [
  '서울',
  '강원',
  '경기',
  '경남',
  '경북',
  '광주',
  '대구',
  '대전',
  '부산',
  '세종',
  '울산',
  '인천',
  '전남',
  '전북',
  '제주',
  '충남',
  '충북',
];

export const MAP_REGIONS: RegionPin[] = REGION_ORDER.map((key) => ({
  key,
  ...REGION_COORDS[key],
}));

export const SECTION_PAGE_SIZE = 6;
