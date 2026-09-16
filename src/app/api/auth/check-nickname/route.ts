import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { users } from '@/db/schema';

export const runtime = 'nodejs';

const TAKEN_NICKNAMES = ['여행자', '관리자'];

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get('value') ?? '';
  if (!value) return NextResponse.json({ taken: false });

  if (TAKEN_NICKNAMES.includes(value)) return NextResponse.json({ taken: true });

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.nickname, value))
    .limit(1);

  return NextResponse.json({ taken: Boolean(existing) });
}
