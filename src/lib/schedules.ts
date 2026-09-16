'use client';

/**
 * 경로/일정(schedules) API 래퍼. `/api/schedules/*` 를 감싸서
 * PlannerClient/MyRoutesClient 가 fetch 를 직접 부르지 않게 한다.
 */

import type { SavedRoute } from '@/types';

export type ScheduleRole = 'creator' | 'editor' | 'viewer';

export interface ScheduleSummary extends SavedRoute {
  role: ScheduleRole;
}

export interface ScheduleDetail {
  schedule: SavedRoute;
  role: ScheduleRole;
  members: { nickname: string; role: 'editor' | 'viewer' }[];
  editRequests: { id: string; nickname: string; createdAt: string }[];
}

export interface ScheduleInput {
  title: string;
  places: SavedRoute['places'];
  segments: SavedRoute['segments'];
  criteria: SavedRoute['criteria'];
  tripStart: string;
  tripEnd: string;
  customName?: boolean;
}

async function json<T>(res: Response): Promise<T | null> {
  return res.json().catch(() => null);
}

export async function listSchedules(): Promise<ScheduleSummary[]> {
  const res = await fetch('/api/schedules');
  const data = await json<{ schedules: ScheduleSummary[] }>(res);
  return data?.schedules ?? [];
}

export async function createSchedule(input: ScheduleInput): Promise<ScheduleSummary | null> {
  const res = await fetch('/api/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await json<{ schedule: ScheduleSummary }>(res);
  return data?.schedule ?? null;
}

export async function getSchedule(id: string): Promise<ScheduleDetail | null> {
  const res = await fetch(`/api/schedules/${id}`);
  if (!res.ok) return null;
  return json<ScheduleDetail>(res);
}

export async function updateSchedule(
  id: string,
  patch: Partial<ScheduleInput>,
): Promise<SavedRoute | null> {
  const res = await fetch(`/api/schedules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await json<{ schedule: SavedRoute }>(res);
  return data?.schedule ?? null;
}

export async function deleteSchedule(id: string): Promise<boolean> {
  const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function getInviteLink(id: string, role: 'editor' | 'viewer'): Promise<string | null> {
  const res = await fetch(`/api/schedules/${id}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  const data = await json<{ token: string; role: string }>(res);
  if (!data) return null;
  return `${window.location.origin}/planner?invite=${data.token}&role=${data.role}`;
}

export async function joinSchedule(
  token: string,
  role: 'editor' | 'viewer',
): Promise<string | null> {
  const res = await fetch('/api/schedules/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, role }),
  });
  const data = await json<{ scheduleId: string }>(res);
  return data?.scheduleId ?? null;
}

export async function requestEditPermission(scheduleId: string): Promise<boolean> {
  const res = await fetch(`/api/schedules/${scheduleId}/edit-requests`, { method: 'POST' });
  return res.ok;
}

export async function resolveEditRequest(
  scheduleId: string,
  requestId: string,
  action: 'approve' | 'reject',
): Promise<boolean> {
  const res = await fetch(`/api/schedules/${scheduleId}/edit-requests/${requestId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return res.ok;
}
