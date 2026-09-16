import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { schedules } from '@/db/schema';
import { getScheduleRole } from '@/lib/server/schedules';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

/**
 * 제작자만 초대 링크를 발급할 수 있다. 보기전용/편집가능 링크는 서로 다른 토큰을 쓰며,
 * 일정마다 역할별로 하나만 만들고 이후에는 그대로 재사용한다.
 */
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

  const tokenColumn =
    inviteRole === 'editor' ? schedules.inviteTokenEditor : schedules.inviteTokenViewer;

  const [row] = await db
    .select({ token: tokenColumn })
    .from(schedules)
    .where(eq(schedules.id, id))
    .limit(1);
  let token = row?.token ?? null;
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    await db
      .update(schedules)
      .set(inviteRole === 'editor' ? { inviteTokenEditor: token } : { inviteTokenViewer: token })
      .where(eq(schedules.id, id));
  }

  return NextResponse.json({ token, role: inviteRole });
}
