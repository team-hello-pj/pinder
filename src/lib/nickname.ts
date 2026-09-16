'use client';

/**
 * 닉네임 중복확인/변경 API 래퍼. 실제 검증(형식/중복/7일 재사용 제한)과 저장은
 * 서버(`/api/account/nickname`)가 한다.
 */

export interface NicknameCheckResult {
  available: boolean;
  reason: 'invalid' | 'same_as_current' | 'taken' | 'protected' | 'ok';
  message: string;
}

export async function checkNickname(nickname: string): Promise<NicknameCheckResult> {
  const res = await fetch('/api/account/nickname', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  const data = await res.json().catch(() => null);
  if (!data) return { available: false, reason: 'invalid', message: '확인하지 못했어요.' };
  return data as NicknameCheckResult;
}

export async function updateNickname(
  nickname: string,
): Promise<{ ok: true; nickname: string } | { ok: false; message: string }> {
  const res = await fetch('/api/account/nickname', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    return { ok: false, message: data?.message ?? '닉네임을 변경하지 못했어요.' };
  }
  return { ok: true, nickname: data.nickname };
}
