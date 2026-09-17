import { NextResponse } from 'next/server';

import { getDestinationRoute, type DestinationTripLength } from '@/lib/server/destinations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * "이 여행지로 일정 짜기" 전용 — 미리 만들어 둔 동선을 그대로 돌려준다.
 * ?days=1|2|3 (당일치기/1박2일/2박3일). 생략하면 1(당일치기)로 본다.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const daysParam = new URL(request.url).searchParams.get('days');
  const days = daysParam === '2' || daysParam === '3' ? Number(daysParam) : 1;

  const route = await getDestinationRoute(id, days as DestinationTripLength);
  if (!route) {
    return NextResponse.json({ error: '아직 준비된 동선이 없어요.' }, { status: 404 });
  }
  return NextResponse.json(route);
}
