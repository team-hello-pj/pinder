'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { MAIN_NAV, ROUTES } from '@/constants';
import { useLoggedIn } from '@/lib/storage';

import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import styles from './SiteHeader.module.css';

/**
 * 모든 화면 상단에 공통으로 붙는 헤더.
 * 메뉴를 추가할 때는 src/constants/nav.ts 의 MAIN_NAV 만 수정하면 된다.
 *
 * 알림 벨은 로그인 상태(`pd-session`)일 때만 보인다. 인증 연동이 아직 없어
 * (AuthForm.tsx 의 TODO 참고) 지금은 항상 로그아웃 상태로 보이지만, 실제
 * 로그인 처리에서 이 키를 세팅하면 자동으로 나타난다.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isLoggedIn = useLoggedIn();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Logo />

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
          {isLoggedIn ? <NotificationBell /> : null}
          <Link href={isLoggedIn ? ROUTES.myPage : ROUTES.login} className={styles.loginLink}>
            {isLoggedIn ? '마이페이지' : '로그인'}
          </Link>
          <Link href={ROUTES.planner} className={styles.cta}>
            경로 만들기
          </Link>
        </div>
      </div>
    </header>
  );
}
