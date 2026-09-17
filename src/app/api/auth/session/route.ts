import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { users } from '@/db/schema';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ user: null });

  // avatarUrl(data URL)은 세션 쿠키에 안 들어있어(용량 때문에) 여기서 따로 조회해 붙여준다.
  const [row] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  return NextResponse.json({ user: { ...sessionUser, avatarUrl: row?.avatarUrl ?? null } });
}
