import { NextResponse } from 'next/server';

import { listNotifications, markAllRead } from '@/lib/server/notifications';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  await markAllRead(session.id);
  const list = await listNotifications(session.id);
  return NextResponse.json({ notifications: list });
}
