import { NextResponse } from 'next/server';
import { ilike } from 'drizzle-orm';

import { db } from '@/db/client';
import { users } from '@/db/schema';

export const runtime = 'nodejs';

const TAKEN_USERNAMES = ['pnder', 'admin', 'traveler', 'test'];

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get('value')?.toLowerCase() ?? '';
  if (!value) return NextResponse.json({ taken: false });

  if (TAKEN_USERNAMES.includes(value)) return NextResponse.json({ taken: true });

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(ilike(users.username, value))
    .limit(1);

  return NextResponse.json({ taken: Boolean(existing) });
}
