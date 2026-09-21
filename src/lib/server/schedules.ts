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
  const ownerInfoById = new Map<string, { nickname: string | null; avatarUrl: string | null }>();
  const collabInfoById = new Map<string, { nickname: string; avatarUrl: string | null }[]>();
  const myTitleById = new Map<string, string>();

  if (allIds.length > 0) {
    const overrideRows = await db
      .select({
        scheduleId: scheduleTitleOverrides.scheduleId,
        title: scheduleTitleOverrides.title,
      })
      .from(scheduleTitleOverrides)
      .where(
        and(
          inArray(scheduleTitleOverrides.scheduleId, allIds),
          eq(scheduleTitleOverrides.userId, userId),
        ),
      );
    for (const row of overrideRows) myTitleById.set(row.scheduleId, row.title);

    const ownerRows = await db
      .select({ id: schedules.id, nickname: users.nickname, avatarUrl: users.avatarUrl })
      .from(schedules)
      .innerJoin(users, eq(schedules.ownerId, users.id))
      .where(inArray(schedules.id, allIds));
    for (const row of ownerRows) {
      ownerInfoById.set(row.id, { nickname: row.nickname, avatarUrl: row.avatarUrl });
    }

    const collabNicknameRows = await db
      .select({
        scheduleId: scheduleCollaborators.scheduleId,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        joinedAt: scheduleCollaborators.createdAt,
      })
      .from(scheduleCollaborators)
      .innerJoin(users, eq(scheduleCollaborators.userId, users.id))
      .where(inArray(scheduleCollaborators.scheduleId, allIds))
      .orderBy(scheduleCollaborators.createdAt);
    for (const row of collabNicknameRows) {
      const list = collabInfoById.get(row.scheduleId) ?? [];
      list.push({ nickname: row.nickname ?? '', avatarUrl: row.avatarUrl });
      collabInfoById.set(row.scheduleId, list);
    }
  }

  // 제작자를 항상 맨 앞에 고정하고(왕관 표시용으로 isOwner: true), 이후 참여자는 참여한(=협업자로
  // 추가된) 순서대로 붙인다. 본인도 어차피 참여자 중 하나이므로 제외하지 않고 그대로 포함한다.
  function buildMembers(
    scheduleId: string,
  ): { nickname: string; isOwner: boolean; avatarUrl: string | null }[] {
    const owner = ownerInfoById.get(scheduleId);
    const collabs = collabInfoById.get(scheduleId) ?? [];
    const seen = new Set<string>();
    const result: { nickname: string; isOwner: boolean; avatarUrl: string | null }[] = [];
    if (owner?.nickname) {
      seen.add(owner.nickname);
      result.push({ nickname: owner.nickname, isOwner: true, avatarUrl: owner.avatarUrl });
    }
    for (const collab of collabs) {
      if (!collab.nickname || seen.has(collab.nickname)) continue;
      seen.add(collab.nickname);
      result.push({ nickname: collab.nickname, isOwner: false, avatarUrl: collab.avatarUrl });
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
