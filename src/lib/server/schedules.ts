import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { scheduleCollaborators, scheduleTitleOverrides, schedules, users } from '@/db/schema';
import type { SavedRoute } from '@/types';

export type ScheduleRole = 'creator' | 'editor' | 'viewer';

export interface ScheduleSummary extends SavedRoute {
  role: ScheduleRole;
}

/** 로그인한 사용자가 제작자이거나 협업자인 모든 일정을, 각자의 권한과 함께 돌려준다. */
export async function listSchedulesForUser(userId: string): Promise<ScheduleSummary[]> {
  const owned = await db.select().from(schedules).where(eq(schedules.ownerId, userId));
  const collabRows = await db
    .select({ schedule: schedules, role: scheduleCollaborators.role })
    .from(scheduleCollaborators)
    .innerJoin(schedules, eq(scheduleCollaborators.scheduleId, schedules.id))
    .where(eq(scheduleCollaborators.userId, userId));

  const allIds = [...owned.map((s) => s.id), ...collabRows.map((r) => r.schedule.id)];
  const ownerNicknameById = new Map<string, string | null>();
  const collabNicknamesById = new Map<string, string[]>();
  const myTitleById = new Map<string, string>();

  if (allIds.length > 0) {
    const overrideRows = await db
      .select({ scheduleId: scheduleTitleOverrides.scheduleId, title: scheduleTitleOverrides.title })
      .from(scheduleTitleOverrides)
      .where(
        and(
          inArray(scheduleTitleOverrides.scheduleId, allIds),
          eq(scheduleTitleOverrides.userId, userId),
        ),
      );
    for (const row of overrideRows) myTitleById.set(row.scheduleId, row.title);

    const ownerRows = await db
      .select({ id: schedules.id, nickname: users.nickname })
      .from(schedules)
      .innerJoin(users, eq(schedules.ownerId, users.id))
      .where(inArray(schedules.id, allIds));
    for (const row of ownerRows) ownerNicknameById.set(row.id, row.nickname);

    const collabNicknameRows = await db
      .select({
        scheduleId: scheduleCollaborators.scheduleId,
        nickname: users.nickname,
        joinedAt: scheduleCollaborators.createdAt,
      })
      .from(scheduleCollaborators)
      .innerJoin(users, eq(scheduleCollaborators.userId, users.id))
      .where(inArray(scheduleCollaborators.scheduleId, allIds))
      .orderBy(scheduleCollaborators.createdAt);
    for (const row of collabNicknameRows) {
      const list = collabNicknamesById.get(row.scheduleId) ?? [];
      list.push(row.nickname ?? '');
      collabNicknamesById.set(row.scheduleId, list);
    }
  }

  // 제작자를 항상 맨 앞에 고정하고(왕관 표시용으로 isOwner: true), 이후 참여자는 참여한(=협업자로
  // 추가된) 순서대로 붙인다. 본인도 어차피 참여자 중 하나이므로 제외하지 않고 그대로 포함한다.
  function buildMembers(scheduleId: string): { nickname: string; isOwner: boolean }[] {
    const owner = ownerNicknameById.get(scheduleId);
    const collabs = collabNicknamesById.get(scheduleId) ?? [];
    const seen = new Set<string>();
    const result: { nickname: string; isOwner: boolean }[] = [];
    if (owner) {
      seen.add(owner);
      result.push({ nickname: owner, isOwner: true });
    }
    for (const nickname of collabs) {
      if (!nickname || seen.has(nickname)) continue;
      seen.add(nickname);
      result.push({ nickname, isOwner: false });
    }
    return result;
  }

  function toSummary(row: (typeof owned)[number], role: ScheduleRole): ScheduleSummary {
    return {
      id: row.id,
      title: myTitleById.get(row.id) ?? row.title,
      places: row.places as SavedRoute['places'],
      segments: row.segments as SavedRoute['segments'],
      criteria: row.criteria as SavedRoute['criteria'],
      tripStart: row.tripStart,
      tripEnd: row.tripEnd,
      customName: Boolean(row.customName),
      updatedAt: row.updatedAt.toISOString(),
      members: buildMembers(row.id),
      role,
    };
  }

  const combined = [
    ...owned.map((row) => ({ row, role: 'creator' as ScheduleRole })),
    ...collabRows.map((r) => ({ row: r.schedule, role: r.role as ScheduleRole })),
  ];
  // 생성된 순서대로, 최신 일정이 맨 위로 오도록 정렬한다.
  combined.sort((a, b) => b.row.createdAt.getTime() - a.row.createdAt.getTime());

  return combined.map(({ row, role }) => toSummary(row, role));
}

/** 이 사용자가 해당 일정에 어떤 권한으로 접근할 수 있는지. 접근 불가면 null. */
export async function getScheduleRole(
  scheduleId: string,
  userId: string,
): Promise<ScheduleRole | null> {
  const [schedule] = await db
    .select({ ownerId: schedules.ownerId })
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .limit(1);
  if (!schedule) return null;
  if (schedule.ownerId === userId) return 'creator';

  const [collab] = await db
    .select({ role: scheduleCollaborators.role })
    .from(scheduleCollaborators)
    .where(
      and(
        eq(scheduleCollaborators.scheduleId, scheduleId),
        eq(scheduleCollaborators.userId, userId),
      ),
    )
    .limit(1);
  return collab ? (collab.role as ScheduleRole) : null;
}
