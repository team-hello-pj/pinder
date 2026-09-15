'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { MAIN_NAV, ROUTES } from '@/constants';

import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import styles from './SiteHeader.module.css';

/**
 * 모든 화면 상단에 공통으로 붙는 헤더 (legacy/main(home).dc.html 의 헤더를 그대로 이식).
 * 메뉴를 추가할 때는 src/constants/nav.ts 의 MAIN_NAV 만 수정하면 된다.
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Logo size="md" animated />

        <nav className={styles.nav} aria-label="주요 메뉴">
          {MAIN_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? `${styles.link} ${styles.linkActive}` : styles.link}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          <div className={styles.desktopOnly}>
            <NotificationBell />
          </div>
          <Link href={ROUTES.login} className={styles.loginBtn}>
            로그인
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
