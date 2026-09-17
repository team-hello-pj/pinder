import { NextResponse } from 'next/server';

import { db } from '@/db/client';
import { schedules } from '@/db/schema';
import { listSchedulesForUser } from '@/lib/server/schedules';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateBody {
  title?: string;
  places?: unknown;
  segments?: unknown;
  criteria?: string;
  tripStart?: string;
  tripEnd?: string;
  routeCache?: unknown;
  customName?: boolean;
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const list = await listSchedulesForUser(session.id);
  return NextResponse.json({ schedules: list });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const body = ((await request.json().catch(() => null)) ?? {}) as CreateBody;
  if (!body.title || !body.places || !body.segments || !body.criteria) {
    return NextResponse.json({ error: '일정 정보가 올바르지 않습니다.' }, { status: 400 });
  }

  const [row] = await db
    .insert(schedules)
    .values({
      ownerId: session.id,
      title: body.title,
      places: body.places,
      segments: body.segments,
      criteria: body.criteria,
      tripStart: body.tripStart ?? '',
      tripEnd: body.tripEnd ?? '',
      routeCache: body.routeCache ?? null,
      customName: body.customName ? 1 : 0,
    })
    .returning();

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
      members: [],
      role: 'creator',
    },
  });
}
