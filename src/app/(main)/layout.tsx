import { Suspense } from 'react';

import { DesktopScaleView } from '@/components/layout/DesktopScaleView';
import { ForceDesktopView } from '@/components/layout/ForceDesktopView';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';

/**
 * 헤더 + 푸터가 있는 일반 화면들의 공통 레이아웃.
 * 여기 추가한 요소는 (main) 그룹의 모든 화면에 자동으로 반영된다.
 * 로그인/회원가입처럼 헤더가 없는 화면은 (auth) 그룹에 둔다.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );

  return (
    <>
      {/* ForceDesktopView/DesktopScaleView 가 useSearchParams() 를 쓰므로 Suspense 경계가 필요하다. */}
      <Suspense fallback={null}>
        <ForceDesktopView />
      </Suspense>
      <Suspense fallback={content}>
        <DesktopScaleView>{content}</DesktopScaleView>
      </Suspense>
    </>
  );
}
