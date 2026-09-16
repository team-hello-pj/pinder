import { NextResponse } from 'next/server';

import { deleteNotification, listNotifications } from '@/lib/server/notifications';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  await deleteNotification(session.id, id);
  const list = await listNotifications(session.id);
  return NextResponse.json({ notifications: list });
}
