import { NextResponse } from 'next/server';

import { db } from '@/db/client';
import { scheduleEditRequests } from '@/db/schema';
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
    .onConflictDoNothing({ target: [scheduleEditRequests.scheduleId, scheduleEditRequests.userId] });

  return NextResponse.json({ ok: true });
}
