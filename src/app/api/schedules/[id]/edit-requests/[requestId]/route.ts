import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { scheduleCollaborators, scheduleEditRequests, schedules } from '@/db/schema';
import { createNotification } from '@/lib/server/notifications';
import { getScheduleRole } from '@/lib/server/schedules';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

/** 제작자의 승인/거절. 승인하면 요청자가 editor 협업자가 되고, 요청은 사라진다. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; requestId: string }> },
) {
  const { id, requestId } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const role = await getScheduleRole(id, session.id);
  if (role !== 'creator') {
    return NextResponse.json({ error: '제작자만 처리할 수 있어요.' }, { status: 403 });
  }

  const { action } = ((await request.json().catch(() => null)) ?? {}) as {
    action?: 'approve' | 'reject';
  };

  const [reqRow] = await db
    .select()
    .from(scheduleEditRequests)
    .where(and(eq(scheduleEditRequests.id, requestId), eq(scheduleEditRequests.scheduleId, id)))
    .limit(1);
  if (!reqRow) return NextResponse.json({ error: '요청을 찾을 수 없습니다.' }, { status: 404 });

  if (action === 'approve') {
    await db
      .insert(scheduleCollaborators)
      .values({ scheduleId: id, userId: reqRow.userId, role: 'editor' })
      .onConflictDoUpdate({
        target: [scheduleCollaborators.scheduleId, scheduleCollaborators.userId],
        set: { role: 'editor' },
      });
  }

  await db.delete(scheduleEditRequests).where(eq(scheduleEditRequests.id, requestId));

  const [schedule] = await db
    .select({ title: schedules.title })
    .from(schedules)
    .where(eq(schedules.id, id))
    .limit(1);
  if (schedule) {
    await createNotification(
      reqRow.userId,
      'schedule',
      action === 'approve'
        ? `「${schedule.title}」 편집 권한 요청이 승인됐어요.`
        : `「${schedule.title}」 편집 권한 요청이 거절됐어요.`,
      'schedule',
    );
  }

  return NextResponse.json({ ok: true });
}
