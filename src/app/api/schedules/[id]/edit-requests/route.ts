import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { scheduleEditRequests, schedules } from '@/db/schema';
import { createNotification } from '@/lib/server/notifications';
import { getScheduleRole } from '@/lib/server/schedules';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

/** viewer 가 편집 권한을 요청한다. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const role = await getScheduleRole(id, session.id);
  if (role !== 'viewer') {
    return NextResponse.json({ error: '보기 전용 참여자만 요청할 수 있어요.' }, { status: 403 });
  }

  await db
    .insert(scheduleEditRequests)
    .values({ scheduleId: id, userId: session.id })
    .onConflictDoNothing({
      target: [scheduleEditRequests.scheduleId, scheduleEditRequests.userId],
    });

  const [schedule] = await db
    .select({ ownerId: schedules.ownerId, title: schedules.title })
    .from(schedules)
    .where(eq(schedules.id, id))
    .limit(1);
  if (schedule) {
    await createNotification(
      schedule.ownerId,
      'schedule',
      `${session.nickname ?? session.name}님이 「${schedule.title}」 편집 권한을 요청했어요.`,
      'schedule',
    );
  }

  return NextResponse.json({ ok: true });
}
