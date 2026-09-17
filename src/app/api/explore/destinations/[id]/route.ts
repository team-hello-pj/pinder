import { NextResponse } from 'next/server';

import { getDestinationRoute } from '@/lib/server/destinations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** "이 여행지로 일정 짜기" 전용 — 미리 만들어 둔 동선을 그대로 돌려준다. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const route = await getDestinationRoute(id);
  if (!route) {
    return NextResponse.json({ error: '아직 준비된 동선이 없어요.' }, { status: 404 });
  }
  return NextResponse.json(route);
}
