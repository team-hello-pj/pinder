import { NextResponse } from 'next/server';

import { clearAllNotifications, listNotifications } from '@/lib/server/notifications';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ notifications: [] });

  const list = await listNotifications(session.id);
  return NextResponse.json({ notifications: list });
}

/** 모두 지우기. */
export async function DELETE() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  await clearAllNotifications(session.id);
  const list = await listNotifications(session.id);
  return NextResponse.json({ notifications: list });
}
