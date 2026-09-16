import { NextResponse } from 'next/server';

import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
