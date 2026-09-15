import type { Metadata } from 'next';

import { ScreenScaffold } from '@/components/layout/ScreenScaffold';

export const metadata: Metadata = { title: '여행지 탐색' };

export default function ExplorePage() {
  return (
    <ScreenScaffold
      title="여행지 탐색"
      description="지도에서 지역을 고르고 추천 여행지를 둘러봅니다."
      legacySource="legacy/Explore Destinations.dc.html"
      owner="미정 — docs/TEAM.md 참고"
      todos={[
        'public/korea-map.svg 를 사용하는 지역 선택 지도 컴포넌트 구현 (features/explore/RegionMap)',
        '지역별 여행지 카드 그리드 + 필터 구현',
        '카드에서 "경로에 담기" → /planner 로 넘기는 흐름 연결',
        '모바일 레이아웃은 legacy/Explore Destinations (Mobile).dc.html 참고',
      ]}
    />
  );
}
