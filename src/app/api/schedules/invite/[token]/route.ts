import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { schedules } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 보기전용 초대 링크 전용 공개 조회 API — 로그인 없이도 접근 가능하다.
 * 편집 가능 링크(inviteTokenEditor)는 여기서 절대 조회되지 않는다: 편집은 로그인 후
 * /api/schedules/join 을 통해 편집 권한 요청 흐름을 타야 한다.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [row] = await db
    .select()
    .from(schedules)
    .where(eq(schedules.inviteTokenViewer, token))
    .limit(1);
  if (!row) return NextResponse.json({ error: '유효하지 않은 초대 링크예요.' }, { status: 404 });

  return NextResponse.json({
    schedule: {
      id: row.id,
      title: row.title,
      places: row.places,
      segments: row.segments,
      criteria: row.criteria,
      tripStart: row.tripStart,
      tripEnd: row.tripEnd,
      routeCache: row.routeCache ?? {},
      customName: Boolean(row.customName),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}
