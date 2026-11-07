import 'server-only';

import { randomBytes } from 'node:crypto';

/** 초대 링크 유효 기간 — 이 기간이 지나면 제작자가 링크를 새로 발급해야 한다. */
export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** 추측할 수 없는 토큰(192비트, URL-safe 32자). */
export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

export function newInviteExpiry(): Date {
  return new Date(Date.now() + INVITE_TTL_MS);
}

/** 만료 시각이 없으면(구형 토큰) 무효로 본다. */
export function isInviteActive(expiresAt: Date | null | undefined): boolean {
  return !!expiresAt && expiresAt.getTime() > Date.now();
}
