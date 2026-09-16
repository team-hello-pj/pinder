import { NextResponse } from 'next/server';

import { listTrendingPlaces } from '@/lib/server/community';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const trending = await listTrendingPlaces(3);
  return NextResponse.json({ trending });
}
