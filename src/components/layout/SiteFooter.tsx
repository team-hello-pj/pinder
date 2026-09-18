'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { Logo } from './Logo';
import styles from './SiteFooter.module.css';

/** 모든 화면 하단에 공통으로 붙는 푸터. */
export function SiteFooter() {
  const pathname = usePathname();
  const [webVersionHref, setWebVersionHref] = useState(`${pathname}?view=pc`);

  useEffect(() => {
    // 기존 쿼리(예: ?post=123)는 유지한 채 view=pc 만 덧붙인다.
    const params = new URLSearchParams(window.location.search);
    params.set('view', 'pc');
    setWebVersionHref(`${pathname}?${params.toString()}`);
  }, [pathname]);

  return (
    <footer className={styles.footer}>
      <Logo size="sm" />
      <p className={styles.copyright}>
        © 2026 p<span className={styles.colon}>:</span>nder made by team_hello
      </p>
      <a href={webVersionHref} className={styles.webVersionLink}>
        웹 버전으로 보기
      </a>
    </footer>
  );
}
