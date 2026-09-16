import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { schedules, users } from '@/db/schema';
import { destroySessionCookie, getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

/**
 * 제작자(creator)인 일정이 있으면 기본적으로 탈퇴를 막는다 — 다른 참여자에게 영향을 주기 때문.
 * force=true 로 다시 요청하면(마이페이지의 "최종 확인" 단계) 사용자 삭제와 함께
 * 그 사용자가 만든 일정도 CASCADE 로 전부 삭제된다.
 */
export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { force } = ((await request.json().catch(() => null)) ?? {}) as { force?: boolean };

  const ownedSchedules = await db
    .select({ id: schedules.id, title: schedules.title })
    .from(schedules)
    .where(eq(schedules.ownerId, sessionUser.id));

  if (ownedSchedules.length > 0 && !force) {
    return NextResponse.json(
      { ok: false, reason: 'has_creator_schedules', schedules: ownedSchedules },
      { status: 409 },
    );
  }

  await db.delete(users).where(eq(users.id, sessionUser.id));
  await destroySessionCookie();
  return NextResponse.json({ ok: true });
}
