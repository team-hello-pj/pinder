import type { Metadata } from 'next';

import { ScreenScaffold } from '@/components/layout/ScreenScaffold';

export const metadata: Metadata = { title: '내 일정' };

export default function MyRoutesPage() {
  return (
    <ScreenScaffold
      title="내 일정"
      description="저장한 경로를 모아 보고, 이어서 편집하거나 공유합니다."
      legacySource="legacy/My Routes.dc.html"
      owner="미정 — docs/TEAM.md 참고"
      todos={[
        'src/lib/storage.ts 의 loadSavedRoutes() 로 저장된 경로 목록 렌더링',
        '경로 카드: 제목·기간·방문지 수·총 소요시간(formatDuration 사용)',
        '이름 변경 / 복제 / 삭제 액션 (removeRoute, upsertRoute 사용)',
        '빈 상태 UI + "새 경로 만들기" → /planner?new=1',
      ]}
    />
  );
}
