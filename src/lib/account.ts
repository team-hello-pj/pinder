'use client';

/**
 * 회원 탈퇴. 제작자(creator)인 일정이 있는지는 서버(`/api/auth/account`)가 직접 확인한다 —
 * 있으면 막고 그 일정 목록을 돌려주며, `force: true` 로 다시 부르면 사용자와 함께
 * 그 일정들도 삭제된다(CASCADE). 세션 정리는 호출 쪽에서 SessionProvider.logout() 으로 한다.
 */

export interface CreatorScheduleSummary {
  id: string;
  title: string;
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: 'has_creator_schedules'; creatorSchedules: CreatorScheduleSummary[] }
  | { ok: false; reason: 'server_error' };

export async function deleteAccount(opts?: { force?: boolean }): Promise<DeleteAccountResult> {
  const res = await fetch('/api/auth/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: opts?.force ?? false }),
  }).catch(() => null);
  if (!res) return { ok: false, reason: 'server_error' };

  const data = await res.json().catch(() => null);
  if (res.status === 409 && data?.reason === 'has_creator_schedules') {
    return { ok: false, reason: 'has_creator_schedules', creatorSchedules: data.schedules ?? [] };
  }
  if (!res.ok || !data?.ok) return { ok: false, reason: 'server_error' };

  return { ok: true };
}
