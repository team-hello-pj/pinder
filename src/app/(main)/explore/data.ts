// MOCK: 실제 연동 시 이 정적 데이터를 추천/인기 여행지 API 응답으로 교체.
// legacy/Explore Destinations.dc.html 의 REGION_COORDS / SECTIONS 를 그대로 옮겼다.

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

export interface Destination {
  name: string;
  region: string;
  badge: string;
  desc: string;
  tags: string[];
}

export interface ExploreSection {
  title: string;
  subtitle: string;
  items: Destination[];
}

export const SECTIONS: ExploreSection[] = [
  {
    title: '당장 차키 챙기자',
    subtitle: '드라이브하기 좋은 곳',
    items: [
      {
        name: '제주도',
        region: '제주',
        badge: '드라이브',
        desc: '오름과 해안도로를 잇는 자유여행의 정석',
        tags: ['자연', '드라이브'],
      },
      {
        name: '부산',
        region: '부산',
        badge: '드라이브',
        desc: '바다와 도심을 함께 즐기는 대표 휴양 도시',
        tags: ['해변', '도시여행'],
      },
      {
        name: '경주',
        region: '경북',
        badge: '드라이브',
        desc: '유적과 벚꽃길이 어우러진 역사 여행지',
        tags: ['역사', '문화'],
      },
      {
        name: '군산',
        region: '전북',
        badge: '드라이브',
        desc: '오래된 빵집과 베이커리 투어로 유명한 항구도시',
        tags: ['베이커리', '카페'],
      },
      {
        name: '동대문',
        region: '서울',
        badge: '드라이브',
        desc: '밤새 열리는 쇼핑 상권과 야시장',
        tags: ['쇼핑', '야경'],
      },
      {
        name: '전주',
        region: '전북',
        badge: '드라이브',
        desc: '한정식과 길거리 음식이 풍부한 미식 도시',
        tags: ['미식', '한옥'],
      },
    ],
  },
  {
    title: '가을 타나봐',
    subtitle: 'ㅇㅇㅇㅇ',
    items: [
      {
        name: '속초',
        region: '강원',
        badge: '급상승',
        desc: '서울에서 가까운 바다+산 당일여행 코스',
        tags: ['근교', '자연'],
      },
      {
        name: '통영',
        region: '경남',
        badge: '급상승',
        desc: '한적한 항구와 섬 여행이 주목받는 곳',
        tags: ['해변', '섬여행'],
      },
      {
        name: '연남동',
        region: '서울',
        badge: '급상승',
        desc: '개성 있는 베이커리와 카페가 몰려있는 동네',
        tags: ['베이커리', '카페'],
      },
      {
        name: '을지로',
        region: '서울',
        badge: '급상승',
        desc: '뉴트로 감성의 소품샵과 쇼핑거리',
        tags: ['쇼핑', '감성'],
      },
      {
        name: '포항',
        region: '경북',
        badge: '급상승',
        desc: '신선한 해산물과 물회가 유명한 미식 여행지',
        tags: ['미식', '해산물'],
      },
    ],
  },
];

export const SECTION_PAGE_SIZE = 6;
