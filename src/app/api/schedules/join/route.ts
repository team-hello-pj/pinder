import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { scheduleCollaborators, schedules } from '@/db/schema';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

/** 초대 링크(`/planner?invite=<token>&role=editor|viewer`)를 연 로그인 사용자를 협업자로 등록한다. */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { token, role } = ((await request.json().catch(() => null)) ?? {}) as {
    token?: string;
    role?: 'editor' | 'viewer';
  };
  if (!token || (role !== 'editor' && role !== 'viewer')) {
    return NextResponse.json({ error: '잘못된 초대 링크입니다.' }, { status: 400 });
  }

  const [schedule] = await db
    .select({ id: schedules.id, ownerId: schedules.ownerId })
    .from(schedules)
    .where(eq(schedules.inviteToken, token))
    .limit(1);
  if (!schedule) {
    return NextResponse.json({ error: '유효하지 않은 초대 링크예요.' }, { status: 404 });
  }

  if (schedule.ownerId === session.id) {
    return NextResponse.json({ scheduleId: schedule.id });
  }

  await db
    .insert(scheduleCollaborators)
    .values({ scheduleId: schedule.id, userId: session.id, role })
    .onConflictDoNothing({ target: [scheduleCollaborators.scheduleId, scheduleCollaborators.userId] });

  return NextResponse.json({ scheduleId: schedule.id });
}
