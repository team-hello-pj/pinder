import { NextResponse } from 'next/server';

import { listExploreSections } from '@/lib/server/destinations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sections = await listExploreSections();
  return NextResponse.json({ sections });
}
