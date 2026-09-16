import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { scheduleCollaborators, schedules, users } from '@/db/schema';
import type { SavedRoute } from '@/types';

export type ScheduleRole = 'creator' | 'editor' | 'viewer';

export interface ScheduleSummary extends SavedRoute {
  role: ScheduleRole;
}

/** 로그인한 사용자가 제작자이거나 협업자인 모든 일정을, 각자의 권한과 함께 돌려준다. */
export async function listSchedulesForUser(
  userId: string,
  selfNickname: string | null,
): Promise<ScheduleSummary[]> {
  const owned = await db.select().from(schedules).where(eq(schedules.ownerId, userId));
  const collabRows = await db
    .select({ schedule: schedules, role: scheduleCollaborators.role })
    .from(scheduleCollaborators)
    .innerJoin(schedules, eq(scheduleCollaborators.scheduleId, schedules.id))
    .where(eq(scheduleCollaborators.userId, userId));

  const allIds = [...owned.map((s) => s.id), ...collabRows.map((r) => r.schedule.id)];
  const ownerNicknameById = new Map<string, string | null>();
  const collabNicknamesById = new Map<string, string[]>();

  if (allIds.length > 0) {
    const ownerRows = await db
      .select({ id: schedules.id, nickname: users.nickname })
      .from(schedules)
      .innerJoin(users, eq(schedules.ownerId, users.id))
      .where(inArray(schedules.id, allIds));
    for (const row of ownerRows) ownerNicknameById.set(row.id, row.nickname);

    const collabNicknameRows = await db
      .select({ scheduleId: scheduleCollaborators.scheduleId, nickname: users.nickname })
      .from(scheduleCollaborators)
      .innerJoin(users, eq(scheduleCollaborators.userId, users.id))
      .where(inArray(scheduleCollaborators.scheduleId, allIds));
    for (const row of collabNicknameRows) {
      const list = collabNicknamesById.get(row.scheduleId) ?? [];
      list.push(row.nickname ?? '');
      collabNicknamesById.set(row.scheduleId, list);
    }
  }

  function buildMembers(scheduleId: string): string[] {
    const owner = ownerNicknameById.get(scheduleId);
    const collabs = collabNicknamesById.get(scheduleId) ?? [];
    const all = [owner, ...collabs].filter((n): n is string => Boolean(n) && n !== selfNickname);
    return Array.from(new Set(all));
  }

  function toSummary(row: (typeof owned)[number], role: ScheduleRole): ScheduleSummary {
    return {
      id: row.id,
      title: row.title,
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

  return [
    ...owned.map((s) => toSummary(s, 'creator')),
    ...collabRows.map((r) => toSummary(r.schedule, r.role as ScheduleRole)),
  ];
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
