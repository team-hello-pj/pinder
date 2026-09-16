'use client';

/** 알림 설정 API 래퍼. `/api/account/notifications`. */

import type { NotificationPrefs } from '@/app/(main)/my-page/data';

export async function getNotificationPrefs(): Promise<NotificationPrefs | null> {
  const res = await fetch('/api/account/notifications');
  const data = await res.json().catch(() => null);
  return data?.prefs ?? null;
}

export async function updateNotificationPrefs(prefs: NotificationPrefs): Promise<boolean> {
  const res = await fetch('/api/account/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefs }),
  });
  return res.ok;
}
