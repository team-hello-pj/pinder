import { NextResponse } from 'next/server';
import { and, eq, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { scheduleCollaborators, scheduleEditRequests, schedules } from '@/db/schema';
import { createNotification } from '@/lib/server/notifications';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

/**
 * 초대 링크(`/planner?invite=<token>&role=editor|viewer`)를 연 로그인 사용자를 등록한다.
 * 권한은 URL의 role 이 아니라 토큰이 어느 컬럼(viewer/editor)과 일치했는지로 정한다 —
 * 그래야 보기전용 링크의 role 값만 바꿔서 편집 권한을 얻는 걸 막을 수 있다.
 *
 * 편집 가능 링크로 들어와도 곧바로 editor 가 되지는 않는다. 일단 viewer 로 참여시키고
 * "편집 권한 요청"을 자동으로 하나 남겨서, 제작자가 승인해야만 실제로 편집할 수 있다
 * (기존 "편집 권한 요청" 승인/거절 흐름을 그대로 재사용 — 알림도 그 경로로 간다).
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
      title: schedules.title,
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

  const linkRole = schedule.inviteTokenEditor === token ? 'editor' : 'viewer';

  const [existing] = await db
    .select({ role: scheduleCollaborators.role })
    .from(scheduleCollaborators)
    .where(
      and(
        eq(scheduleCollaborators.scheduleId, schedule.id),
        eq(scheduleCollaborators.userId, session.id),
      ),
    )
    .limit(1);

  if (linkRole === 'viewer') {
    if (!existing) {
      await db
        .insert(scheduleCollaborators)
        .values({ scheduleId: schedule.id, userId: session.id, role: 'viewer' })
        .onConflictDoNothing({
          target: [scheduleCollaborators.scheduleId, scheduleCollaborators.userId],
        });
    }
    return NextResponse.json({ scheduleId: schedule.id });
  }

  // linkRole === 'editor' — 이미 승인된 editor 면 그대로 두고, 아니면 viewer 로 참여시키고 요청만 남긴다.
  if (existing?.role === 'editor') {
    return NextResponse.json({ scheduleId: schedule.id });
  }

  if (!existing) {
    await db
      .insert(scheduleCollaborators)
      .values({ scheduleId: schedule.id, userId: session.id, role: 'viewer' })
      .onConflictDoNothing({
        target: [scheduleCollaborators.scheduleId, scheduleCollaborators.userId],
      });
  }

  const [existingRequest] = await db
    .select({ id: scheduleEditRequests.id })
    .from(scheduleEditRequests)
    .where(
      and(
        eq(scheduleEditRequests.scheduleId, schedule.id),
        eq(scheduleEditRequests.userId, session.id),
      ),
    )
    .limit(1);

  if (!existingRequest) {
    const [newRequest] = await db
      .insert(scheduleEditRequests)
      .values({ scheduleId: schedule.id, userId: session.id })
      .onConflictDoNothing({
        target: [scheduleEditRequests.scheduleId, scheduleEditRequests.userId],
      })
      .returning({ id: scheduleEditRequests.id });
    if (newRequest) {
      await createNotification(
        schedule.ownerId,
        'schedule',
        `${session.nickname ?? session.name}님이 설정한 「${schedule.title}」에 편집 권한을 수락하시겠습니까?`,
        'schedule',
        { scheduleId: schedule.id, requestId: newRequest.id },
      );
    }
  }

  return NextResponse.json({ scheduleId: schedule.id, pending: true });
}
