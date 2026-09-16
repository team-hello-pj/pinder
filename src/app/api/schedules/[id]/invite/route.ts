import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { schedules } from '@/db/schema';
import { getScheduleRole } from '@/lib/server/schedules';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

/** 제작자만 초대 링크를 발급할 수 있다. 토큰은 일정마다 하나만 만들고 재사용한다. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const role = await getScheduleRole(id, session.id);
  if (role !== 'creator') {
    return NextResponse.json({ error: '초대 링크는 제작자만 만들 수 있어요.' }, { status: 403 });
  }

  const { role: inviteRole } = ((await request.json().catch(() => null)) ?? {}) as {
    role?: 'editor' | 'viewer';
  };
  if (inviteRole !== 'editor' && inviteRole !== 'viewer') {
    return NextResponse.json({ error: 'role은 editor 또는 viewer 여야 합니다.' }, { status: 400 });
  }

  const [row] = await db
    .select({ inviteToken: schedules.inviteToken })
    .from(schedules)
    .where(eq(schedules.id, id))
    .limit(1);
  let token = row?.inviteToken ?? null;
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    await db.update(schedules).set({ inviteToken: token }).where(eq(schedules.id, id));
  }

  return NextResponse.json({ token, role: inviteRole });
}
