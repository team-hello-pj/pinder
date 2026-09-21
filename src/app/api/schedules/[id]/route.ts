import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  scheduleCollaborators,
  scheduleEditRequests,
  scheduleTitleOverrides,
  schedules,
  users,
} from '@/db/schema';
import { getScheduleRole } from '@/lib/server/schedules';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UpdateBody {
  title?: string;
  /** "내 일정"에서만 보이는 개인화 이름 — 카카오톡 단톡방 이름처럼 본인 화면에만 반영된다. */
  personalTitle?: string;
  places?: unknown;
  segments?: unknown;
  criteria?: string;
  tripStart?: string;
  tripEnd?: string;
  routeCache?: unknown;
  customName?: boolean;
}

async function getMyTitleOverride(scheduleId: string, userId: string): Promise<string | undefined> {
  const [row] = await db
    .select({ title: scheduleTitleOverrides.title })
    .from(scheduleTitleOverrides)
    .where(
      and(
        eq(scheduleTitleOverrides.scheduleId, scheduleId),
        eq(scheduleTitleOverrides.userId, userId),
      ),
    )
    .limit(1);
  return row?.title;
}

function serialize(row: typeof schedules.$inferSelect, myTitle?: string) {
  return {
    id: row.id,
    title: myTitle ?? row.title,
    places: row.places,
    segments: row.segments,
    criteria: row.criteria,
    tripStart: row.tripStart,
    tripEnd: row.tripEnd,
    routeCache: row.routeCache ?? {},
    customName: Boolean(row.customName),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const role = await getScheduleRole(id, session.id);
  if (!role) return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });

  const [row] = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 });
  const myTitle = await getMyTitleOverride(id, session.id);

  let members: { nickname: string; role: 'editor' | 'viewer' }[] = [];
  let editRequests: { id: string; nickname: string; createdAt: string }[] = [];

  if (role === 'creator') {
    const collabRows = await db
      .select({ nickname: users.nickname, role: scheduleCollaborators.role })
      .from(scheduleCollaborators)
      .innerJoin(users, eq(scheduleCollaborators.userId, users.id))
      .where(eq(scheduleCollaborators.scheduleId, id));
    members = collabRows.map((r) => ({
      nickname: r.nickname ?? '',
      role: r.role as 'editor' | 'viewer',
    }));

    const requestRows = await db
      .select({
        id: scheduleEditRequests.id,
        nickname: users.nickname,
        createdAt: scheduleEditRequests.createdAt,
      })
      .from(scheduleEditRequests)
      .innerJoin(users, eq(scheduleEditRequests.userId, users.id))
      .where(eq(scheduleEditRequests.scheduleId, id));
    editRequests = requestRows.map((r) => ({
      id: r.id,
      nickname: r.nickname ?? '',
      createdAt: r.createdAt.toISOString(),
    }));
  }

  let myEditRequestPending = false;
  if (role === 'viewer') {
    const [myRequest] = await db
      .select({ id: scheduleEditRequests.id })
      .from(scheduleEditRequests)
      .where(
        and(eq(scheduleEditRequests.scheduleId, id), eq(scheduleEditRequests.userId, session.id)),
      )
      .limit(1);
    myEditRequestPending = Boolean(myRequest);
  }

  return NextResponse.json({
    schedule: serialize(row, myTitle),
    role,
    members,
    editRequests,
    myEditRequestPending,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const role = await getScheduleRole(id, session.id);
  if (!role) return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });

  const body = ((await request.json().catch(() => null)) ?? {}) as UpdateBody;

  // 개인화된 제목("내 일정"에서만 보이는 이름)은 뷰어를 포함해 이 일정에 접근 가능한
  // 사람 누구나 자기 계정 기준으로 바꿀 수 있다 — 카카오톡 단톡방 이름처럼 원본
  // schedules.title(제작자가 처음 만들고 공유한 이름)에는 영향을 주지 않는다.
  if (body.personalTitle !== undefined) {
    const name = body.personalTitle.trim();
    if (name) {
      await db
        .insert(scheduleTitleOverrides)
        .values({ scheduleId: id, userId: session.id, title: name })
        .onConflictDoUpdate({
          target: [scheduleTitleOverrides.scheduleId, scheduleTitleOverrides.userId],
          set: { title: name, updatedAt: new Date() },
        });
    }
  }

  const hasScheduleFields =
    body.title !== undefined ||
    body.places !== undefined ||
    body.segments !== undefined ||
    body.criteria !== undefined ||
    body.tripStart !== undefined ||
    body.tripEnd !== undefined ||
    body.routeCache !== undefined ||
    body.customName !== undefined;

  if (hasScheduleFields && role !== 'creator' && role !== 'editor') {
    return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
  }

  let row: typeof schedules.$inferSelect | undefined;
  if (hasScheduleFields) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) patch.title = body.title;
    if (body.places !== undefined) patch.places = body.places;
    if (body.segments !== undefined) patch.segments = body.segments;
    if (body.criteria !== undefined) patch.criteria = body.criteria;
    // 날짜 변경은 제작자만 할 수 있다 — 편집 권한을 받은 협업자도 불가. 다만 편집자의 다른
    // 자동 저장(방문지 등)에는 기존 날짜값이 그대로 실려 오므로, 조용히 무시만 하고 요청
    // 자체를 실패시키지는 않는다.
    if (body.tripStart !== undefined && role === 'creator') patch.tripStart = body.tripStart;
    if (body.tripEnd !== undefined && role === 'creator') patch.tripEnd = body.tripEnd;
    if (body.routeCache !== undefined) patch.routeCache = body.routeCache;
    if (body.customName !== undefined) patch.customName = body.customName ? 1 : 0;
    [row] = await db.update(schedules).set(patch).where(eq(schedules.id, id)).returning();
  } else {
    [row] = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
  }
  if (!row) return NextResponse.json({ error: '일정을 찾을 수 없습니다.' }, { status: 404 });

  const myTitle = await getMyTitleOverride(id, session.id);
  return NextResponse.json({ schedule: serialize(row, myTitle) });
}

/**
 * 제작자가 지우면 일정 자체가 삭제된다(CASCADE 로 협업자/요청도 함께 삭제).
 * 협업자(editor/viewer)가 지우면 "내 일정에서만 제거" — 자기 협업 관계만 삭제하고 원본은 남는다.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const role = await getScheduleRole(id, session.id);
  if (!role) return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });

  if (role === 'creator') {
    await db.delete(schedules).where(eq(schedules.id, id));
  } else {
    await db
      .delete(scheduleCollaborators)
      .where(
        and(eq(scheduleCollaborators.scheduleId, id), eq(scheduleCollaborators.userId, session.id)),
      );
  }

  return NextResponse.json({ ok: true });
}
