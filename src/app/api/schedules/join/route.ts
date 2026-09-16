import { NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { scheduleCollaborators, schedules } from '@/db/schema';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

/**
 * 초대 링크(`/planner?invite=<token>&role=editor|viewer`)를 연 로그인 사용자를 협업자로 등록한다.
 * 권한은 URL의 role 이 아니라 토큰이 어느 컬럼(viewer/editor)과 일치했는지로 정한다 —
 * 그래야 보기전용 링크의 role 값만 바꿔서 편집 권한을 얻는 걸 막을 수 있다.
 */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { token } = ((await request.json().catch(() => null)) ?? {}) as { token?: string };
  if (!token) {
    return NextResponse.json({ error: '잘못된 초대 링크입니다.' }, { status: 400 });
  }

  const [schedule] = await db
    .select({
      id: schedules.id,
      ownerId: schedules.ownerId,
      inviteTokenViewer: schedules.inviteTokenViewer,
      inviteTokenEditor: schedules.inviteTokenEditor,
    })
    .from(schedules)
    .where(or(eq(schedules.inviteTokenViewer, token), eq(schedules.inviteTokenEditor, token)))
    .limit(1);
  if (!schedule) {
    return NextResponse.json({ error: '유효하지 않은 초대 링크예요.' }, { status: 404 });
  }

  if (schedule.ownerId === session.id) {
    return NextResponse.json({ scheduleId: schedule.id });
  }

  const role = schedule.inviteTokenEditor === token ? 'editor' : 'viewer';

  await db
    .insert(scheduleCollaborators)
    .values({ scheduleId: schedule.id, userId: session.id, role })
    .onConflictDoUpdate({
      target: [scheduleCollaborators.scheduleId, scheduleCollaborators.userId],
      set: { role },
    });

  return NextResponse.json({ scheduleId: schedule.id });
}
