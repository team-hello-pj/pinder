'use client';

import { useState } from 'react';

import styles from './NotificationBell.module.css';

interface NotificationItem {
  id: number;
  text: string;
  read: boolean;
}

// TODO(백엔드 연동): 실제 알림 API가 붙기 전까지의 목업 데이터.
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 1, text: '유수님이 「제주 3박4일」에 댓글을 남겼어요.', read: false },
  { id: 2, text: '내일 출발하는 일정이 있어요: 대전 당일치기', read: false },
  { id: 3, text: '새로운 기능 소식이 도착했어요.', read: true },
];

/** 헤더의 알림 종. 열 때 전부 읽음 처리한다 (레거시와 동일한 동작). */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const hasUnread = notifications.some((n) => !n.read);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) setNotifications((list) => list.map((n) => ({ ...n, read: true })));
      return next;
    });
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        onClick={toggle}
        title="알림"
        aria-label="알림"
        aria-expanded={open}
      >
        <svg
          width="16"
          height="16"
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
        {hasUnread ? <span className={styles.dot} aria-hidden /> : null}
      </button>

      {open ? (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <div className={styles.panel} role="menu">
            {notifications.map((n) => (
              <div key={n.id} className={styles.item} style={{ fontWeight: n.read ? 500 : 700 }}>
                <span className={styles.itemDot} style={{ opacity: n.read ? 0 : 1 }} aria-hidden />
                <span aria-hidden>–</span>
                <span>{n.text}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
