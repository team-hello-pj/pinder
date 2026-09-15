import type { Metadata } from 'next';

import { ScreenScaffold } from '@/components/layout/ScreenScaffold';

export const metadata: Metadata = { title: '커뮤니티' };

export default function CommunityPage() {
  return (
    <ScreenScaffold
      title="커뮤니티"
      description="다른 사람들이 공유한 여행 경로를 보고 내 일정으로 가져옵니다."
      legacySource="legacy/Community.dc.html"
      owner="미정 — docs/TEAM.md 참고"
      todos={[
        '지역 필터 사이드바 + 피드 목록 + 인기 태그 사이드 카드 (3단 레이아웃)',
        '게시글 카드: 작성자·썸네일·좋아요·댓글 수',
        '"내 일정으로 가져오기" 액션 → upsertRoute()',
        '모바일 레이아웃은 legacy/Community (Mobile).dc.html 참고',
      ]}
    />
  );
}
