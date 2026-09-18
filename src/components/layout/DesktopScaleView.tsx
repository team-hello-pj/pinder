'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

/** PC 레이아웃이 기준으로 삼는 가로 폭. --pd-content-max(1200px) + 여백을 고려한 값. */
const DESKTOP_REFERENCE_WIDTH = 1280;

/**
 * ?view=pc 로 들어온 좁은 화면에서, PC 레이아웃을 DESKTOP_REFERENCE_WIDTH 기준 그대로 렌더링한 뒤
 * transform: scale() 로 실제 화면 폭에 맞춰 통째로 축소해 보여준다.
 * - PC 레이아웃 자체(HTML/CSS/폭/구조)는 전혀 건드리지 않는다 — 렌더링 결과를 시각적으로만 줄인다.
 * - 실제 폭이 DESKTOP_REFERENCE_WIDTH 이상(진짜 PC 브라우저)이면 스타일을 지워 원래 유동폭 그대로 둔다.
 * - ForceDesktopView(<html class="force-desktop-view">)와 별개로 동작하며, 그쪽 클래스/로직은 건드리지 않는다.
 * - style 을 ref 로 직접 다루는 이유: React state 로 다루면 이 값이 바뀔 때마다 자식(SiteHeader/SiteFooter
 *   등)이 다시 마운트되어 MobileMenu 열림 상태 같은 내부 state 가 날아간다.
 */
export function DesktopScaleView({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const forcePc = searchParams.get('view') === 'pc';
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const width = window.innerWidth;
      if (forcePc && width < DESKTOP_REFERENCE_WIDTH) {
        const scale = width / DESKTOP_REFERENCE_WIDTH;
        outer.style.overflowX = 'hidden';
        inner.style.width = `${DESKTOP_REFERENCE_WIDTH}px`;
        inner.style.transform = `scale(${scale})`;
        inner.style.transformOrigin = 'top left';
      } else {
        outer.style.overflowX = '';
        inner.style.width = '';
        inner.style.transform = '';
        inner.style.transformOrigin = '';
      }
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [forcePc]);

  return (
    <div ref={outerRef}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
