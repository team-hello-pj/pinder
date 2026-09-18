'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export const FORCE_DESKTOP_VIEW_CLASS = 'force-desktop-view';

/**
 * URL 에 ?view=pc 가 있으면 <html> 에 force-desktop-view 클래스를 붙인다.
 * 각 화면의 모듈 CSS 안에 :global(.force-desktop-view) 로 만든 오버라이드 규칙이
 * 767px 이하 미디어쿼리보다 우선 적용되어, 실제 화면 폭과 무관하게 PC 레이아웃이 보인다.
 * (main) 레이아웃에만 마운트한다 — SiteFooter 의 "웹 버전으로 보기" 링크와 짝이다.
 */
export function ForceDesktopView() {
  const searchParams = useSearchParams();
  const forcePc = searchParams.get('view') === 'pc';

  useEffect(() => {
    document.documentElement.classList.toggle(FORCE_DESKTOP_VIEW_CLASS, forcePc);
    return () => {
      document.documentElement.classList.remove(FORCE_DESKTOP_VIEW_CLASS);
    };
  }, [forcePc]);

  return null;
}
