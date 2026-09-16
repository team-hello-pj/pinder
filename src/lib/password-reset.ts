'use client';

/** 비밀번호 재설정 API 래퍼. 인증번호 검증은 회원가입과 같은 `/api/auth/verify-code` 를 그대로 쓴다. */

import type { AuthUser } from '@/lib/auth';

export interface SendResetCodeResult {
  ok: true;
  cooldownSec: number;
  expiresInSec: number;
}

export async function sendPasswordResetCode(email: string): Promise<SendResetCodeResult> {
  const res = await fetch('/api/auth/password-reset/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error ?? '인증번호 발송에 실패했습니다.');
  }
  return data as SendResetCodeResult;
}

export type ConfirmPasswordResetResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };

export async function confirmPasswordReset(
  email: string,
  password: string,
): Promise<ConfirmPasswordResetResult> {
  const res = await fetch('/api/auth/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    return { ok: false, message: data?.message ?? '비밀번호를 변경하지 못했어요.' };
  }
  return { ok: true, user: data.user as AuthUser };
}
