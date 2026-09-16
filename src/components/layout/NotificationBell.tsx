'use client';

import { useState } from 'react';

import styles from './NotificationBell.module.css';

type NotificationType = 'comment' | 'schedule' | 'feature';

interface AppNotification {
  id: number;
  type: NotificationType;
  text: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: 1, type: 'comment', text: '유수님이 「제주 3박4일」에 댓글을 남겼어요.', read: false },
  { id: 2, type: 'schedule', text: '내일 출발하는 일정이 있어요: 대전 당일치기', read: false },
  { id: 3, type: 'feature', text: '새로운 기능 소식이 도착했어요.', read: true },
];

function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === 'comment') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    );
  }
  if (type === 'schedule') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M3 9h18" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2l1.9 5.9L20 10l-6.1 2.1L12 18l-1.9-5.9L4 10l6.1-2.1z" />
    </svg>
  );
}

/**
 * 헤더 알림 벨. 열 때 전체를 읽음 처리하는 동작은 legacy/main(home).dc.html 과 동일하게 맞췄다.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  const hasUnread = notifications.some((n) => !n.read);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) setNotifications((list) => list.map((n) => ({ ...n, read: true })));
      return next;
    });
  };

  const deleteNotification = (id: number) => {
    setNotifications((list) => list.filter((n) => n.id !== id));
  };

  const clearAll = () => setNotifications([]);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.bell}
        onClick={toggleOpen}
        title="알림"
        aria-label="알림"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a5 5 0 0 0-5 5v3.2c0 .6-.24 1.18-.66 1.6L4.8 14.3c-.86.86-.25 2.34.95 2.34h12.5c1.2 0 1.8-1.48.95-2.34l-1.54-1.5A2.27 2.27 0 0 1 17 11.2V8a5 5 0 0 0-5-5Z" />
          <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
        </svg>
        {hasUnread ? <span className={styles.dot} /> : null}
      </button>

      {open ? (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <div className={styles.panel}>
            {notifications.length > 0 ? (
              <>
                {notifications.map((n) => (
                  <div key={n.id} className={styles.row}>
                    <div className={styles.iconBadge}>
                      <NotificationIcon type={n.type} />
                    </div>
                    <span className={styles.text}>{n.text}</span>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => deleteNotification(n.id)}
                      title="삭제"
                      aria-label="알림 삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className={styles.footer}>
                  <button type="button" className={styles.clearAll} onClick={clearAll}>
                    모두 지우기
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.empty}>새로운 알림이 없습니다.</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
