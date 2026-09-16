import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { DEFAULT_NOTIFICATION_PREFS } from '@/app/(main)/my-page/data';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const [row] = await db
    .select({ prefs: users.notificationPrefs })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);

  return NextResponse.json({ prefs: row?.prefs ?? DEFAULT_NOTIFICATION_PREFS });
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { prefs } = ((await request.json().catch(() => null)) ?? {}) as {
    prefs?: Record<string, boolean>;
  };
  if (!prefs) return NextResponse.json({ error: 'prefs가 필요합니다.' }, { status: 400 });

  await db.update(users).set({ notificationPrefs: prefs }).where(eq(users.id, session.id));
  return NextResponse.json({ ok: true, prefs });
}
