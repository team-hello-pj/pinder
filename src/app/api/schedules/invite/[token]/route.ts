import { NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { schedules } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 초대 링크(보기 전용/편집 가능 모두)로 로그인 없이도 접근 가능한 공개 "조회" API.
 * 편집 가능 링크의 토큰도 여기서 조회는 허용한다 — 링크만 있으면 로그인 여부와 상관없이
 * 목록/경로부터 바로 볼 수 있어야 하기 때문. 다만 여기서는 읽기만 가능하고, 실제 편집
 * 권한을 얻으려면 로그인 후 /api/schedules/join 을 통한 승인 흐름을 타야 한다.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [row] = await db
    .select()
    .from(schedules)
    .where(or(eq(schedules.inviteTokenViewer, token), eq(schedules.inviteTokenEditor, token)))
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
