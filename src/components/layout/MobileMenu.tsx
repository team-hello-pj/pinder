'use client';

import Link from 'next/link';
import { useState } from 'react';

import { MAIN_NAV, ROUTES } from '@/constants';

import styles from './MobileMenu.module.css';

/** 767px 이하에서 내비게이션·로그인·알림을 모아 보여주는 햄버거 메뉴. */
export function MobileMenu() {
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
            <Link href={ROUTES.login} className={styles.loginLink} onClick={close}>
              로그인
            </Link>
            <div className={styles.notifyRow}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3a5 5 0 0 0-5 5v3.2c0 .6-.24 1.18-.66 1.6L4.8 14.3c-.86.86-.25 2.34.95 2.34h12.5c1.2 0 1.8-1.48.95-2.34l-1.54-1.5A2.27 2.27 0 0 1 17 11.2V8a5 5 0 0 0-5-5Z" />
                <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
              </svg>
              <span>알림</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
