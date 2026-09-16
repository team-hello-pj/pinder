'use client';

/**
 * 이메일 인증번호 발송/확인 API 래퍼. 실제 발송·저장·검증은 서버(`/api/auth/send-code`,
 * `/api/auth/verify-code`)가 처리한다.
 */

export interface SendCodeResult {
  ok: true;
  cooldownSec: number;
  expiresInSec: number;
}

export type VerifyCodeResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'expired' | 'too_many_attempts' };

export async function sendCode(email: string): Promise<SendCodeResult> {
  const res = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error ?? '인증번호 발송에 실패했습니다.');
  }
  return data as SendCodeResult;
}

export async function verifyCode(email: string, code: string): Promise<VerifyCodeResult> {
  const res = await fetch('/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json().catch(() => null);
  if (!data) return { ok: false, reason: 'invalid' };
  return data as VerifyCodeResult;
}
