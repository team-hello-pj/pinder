'use client';

/** 헤더 알림벨 API 래퍼 (`/api/notifications/*`). */

export type NotificationType = 'comment' | 'schedule' | 'feature';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  text: string;
  read: boolean;
  createdAt: number;
  relatedScheduleId: string | null;
  relatedRequestId: string | null;
}

async function json(res: Response): Promise<NotificationItem[]> {
  const data = await res.json().catch(() => null);
  return data?.notifications ?? [];
}

export async function listNotifications(): Promise<NotificationItem[]> {
  const res = await fetch('/api/notifications');
  return json(res);
}

export async function markAllNotificationsRead(): Promise<NotificationItem[]> {
  const res = await fetch('/api/notifications/read-all', { method: 'POST' });
  return json(res);
}

export async function deleteNotification(id: string): Promise<NotificationItem[]> {
  const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
  return json(res);
}

export async function clearAllNotifications(): Promise<NotificationItem[]> {
  const res = await fetch('/api/notifications', { method: 'DELETE' });
  return json(res);
}
