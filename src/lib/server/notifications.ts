import 'server-only';

import { and, desc, eq } from 'drizzle-orm';

import { DEFAULT_NOTIFICATION_PREFS } from '@/app/(main)/my-page/data';
import { db } from '@/db/client';
import { notifications, scheduleCollaborators, schedules, users } from '@/db/schema';

export type NotificationType = 'comment' | 'schedule' | 'feature';

export interface NotificationView {
  id: string;
  type: NotificationType;
  text: string;
  read: boolean;
  createdAt: number;
  relatedScheduleId: string | null;
  relatedRequestId: string | null;
}

const MAX_STORED = 30;

/** prefs 가 아직 저장 전(null)이면 기본값을 쓴다 — my-page 알림 설정과 같은 기준. */
async function getPrefs(userId: string): Promise<Record<string, boolean>> {
  const [row] = await db
    .select({ prefs: users.notificationPrefs })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return (row?.prefs as Record<string, boolean>) ?? DEFAULT_NOTIFICATION_PREFS;
}

/**
 * prefKey 가 꺼져 있으면 알림을 만들지 않는다.
 * related 를 넘기면 알림벨에서 바로 승인/거절할 수 있는 액션형 알림이 된다.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  text: string,
  prefKey: keyof typeof DEFAULT_NOTIFICATION_PREFS,
  related?: { scheduleId: string; requestId: string },
): Promise<void> {
  const prefs = await getPrefs(userId);
  if (prefs[prefKey] === false) return;
  await db.insert(notifications).values({
    userId,
    type,
    text,
    relatedScheduleId: related?.scheduleId,
    relatedRequestId: related?.requestId,
  });
}

function tomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** 저장된 알림 + "내일 출발" 일정 임박 알림(그때그때 계산, 저장 안 함)을 합쳐서 돌려준다. */
export async function listNotifications(userId: string): Promise<NotificationView[]> {
  const stored = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(MAX_STORED);

  const storedView: NotificationView[] = stored.map((n) => ({
    id: n.id,
    type: n.type as NotificationType,
    text: n.text,
    read: n.read,
    createdAt: n.createdAt.getTime(),
    relatedScheduleId: n.relatedScheduleId,
    relatedRequestId: n.relatedRequestId,
  }));

  const prefs = await getPrefs(userId);
  if (prefs.scheduleStart === false) return storedView;

  const tomorrow = tomorrowDateStr();
  const ownedTripsTomorrow = await db
    .select({ id: schedules.id, title: schedules.title })
    .from(schedules)
    .where(and(eq(schedules.ownerId, userId), eq(schedules.tripStart, tomorrow)));
  const collabTripsTomorrow = await db
    .select({ id: schedules.id, title: schedules.title })
    .from(scheduleCollaborators)
    .innerJoin(schedules, eq(scheduleCollaborators.scheduleId, schedules.id))
    .where(and(eq(scheduleCollaborators.userId, userId), eq(schedules.tripStart, tomorrow)));

  const seen = new Set<string>();
  const virtual: NotificationView[] = [];
  for (const s of [...ownedTripsTomorrow, ...collabTripsTomorrow]) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    virtual.push({
      id: `trip-start-${s.id}`,
      type: 'schedule',
      text: `내일 출발하는 일정이 있어요: ${s.title}`,
      read: true, // 저장되지 않는 실시간 알림이라 읽음 상태를 따로 관리하지 않는다.
      createdAt: Date.now(),
      relatedScheduleId: null,
      relatedRequestId: null,
    });
  }

  return [...virtual, ...storedView];
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

export async function deleteNotification(userId: string, id: string): Promise<void> {
  await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function clearAllNotifications(userId: string): Promise<void> {
  await db.delete(notifications).where(eq(notifications.userId, userId));
}
