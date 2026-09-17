'use client';

import Link from 'next/link';
import { useState } from 'react';

import { MAIN_NAV, ROUTES } from '@/constants';
import { useSession } from '@/components/providers/SessionProvider';

import styles from './MobileMenu.module.css';

/** 767px 이하에서 내비게이션·로그인·알림을 모아 보여주는 햄버거 메뉴. */
export function MobileMenu() {
  const { isLoggedIn } = useSession();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        onClick={() => setOpen((v) => !v)}
        aria-label="메뉴 열기"
        aria-expanded={open}
      >
        ☰
      </button>

      {open ? (
        <>
          <div className={styles.overlay} onClick={close} />
          <div className={styles.panel} role="menu">
            {MAIN_NAV.map((item) => (
              <Link key={item.href} href={item.href} className={styles.link} onClick={close}>
                {item.label}
              </Link>
            ))}
            <Link
              href={isLoggedIn ? ROUTES.myPage : ROUTES.login}
              className={styles.loginLink}
              onClick={close}
            >
              {isLoggedIn ? '마이페이지' : '로그인'}
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
