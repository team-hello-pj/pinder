import type { Metadata } from 'next';

import { ScreenScaffold } from '@/components/layout/ScreenScaffold';

export const metadata: Metadata = { title: '마이페이지' };

export default function MyPage() {
  return (
    <ScreenScaffold
      title="마이페이지"
      description="프로필과 계정 설정을 관리합니다."
      legacySource="legacy/My Page.dc.html"
      owner="미정 — docs/TEAM.md 참고"
      todos={[
        '프로필 카드 (아바타 업로드 포함)',
        '닉네임 변경 모달 — components/ui/Modal 재사용',
        '설정 목록: 테마(이미 ThemeProvider 로 동작), 알림, 로그아웃',
        '회원 탈퇴 확인 플로우',
      ]}
    />
  );
}
