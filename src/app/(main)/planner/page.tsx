import type { Metadata } from 'next';

import { ScreenScaffold } from '@/components/layout/ScreenScaffold';

export const metadata: Metadata = { title: '경로 만들기' };

export default function PlannerPage() {
  return (
    <ScreenScaffold
      title="경로 만들기"
      description="방문지를 담고 이동수단과 기준을 골라 최적 동선을 만듭니다."
      legacySource="legacy/Route Planner App.dc.html"
      owner="미정 — docs/TEAM.md 참고"
      todos={[
        '좌우 2단 셸 레이아웃 (좌: 방문지 패널 / 우: 지도) — 접기/펼치기 포함',
        '장소 검색: lib/kakao/client.ts 의 searchKeyword() 사용',
        '지도: loadKakaoMapsSdk() 로 SDK 로드 후 마커·폴리라인 렌더링',
        '구간 경로: fetchRouteLeg(mode, req) 결과를 routeCache 에 모아 합계 계산',
        '드래그 순서 변경 / 자동 재조정: lib/route-engine.ts 의 computeAutoAdjustment()',
        '상황 변경 모달: applySituationAdjustment() 연결',
        'AI 도우미 패널: lib/chat.ts 의 askAssistant() 연결',
        '저장: lib/storage.ts 의 upsertRoute()',
      ]}
    />
  );
}
