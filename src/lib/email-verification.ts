'use client';

/**
 * 목업 이메일 인증 서비스. legacy/Signup Screen.dc.html 의 EmailVerificationService 를 그대로 옮겼다.
 * 실제 배포 시 이 세 메서드만 서버 API 호출로 교체하면 된다 (인증번호는 클라이언트에 노출되지 않아야 함 —
 * 지금은 프로토타입이라 console.log 로만 확인한다).
 */

const CODE_TTL_SEC = 300;
const RESEND_COOLDOWN_SEC = 60;
const MAX_ATTEMPTS = 5;

interface CodeRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

const store = new Map<string, CodeRecord>();

export interface SendCodeResult {
  ok: true;
  cooldownSec: number;
  expiresInSec: number;
}

export type VerifyCodeResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'expired' | 'too_many_attempts' };

export function sendCode(email: string): Promise<SendCodeResult> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.set(email, { code, expiresAt: Date.now() + CODE_TTL_SEC * 1000, attempts: 0 });
  // MOCK: 실제로는 서버가 발송하고 클라이언트로 값을 전달하지 않는다.
  console.log('[MOCK] 이메일 인증번호 발송:', email, code);
  return Promise.resolve({
    ok: true,
    cooldownSec: RESEND_COOLDOWN_SEC,
    expiresInSec: CODE_TTL_SEC,
  });
}

export function verifyCode(email: string, code: string): Promise<VerifyCodeResult> {
  const rec = store.get(email);
  if (!rec) return Promise.resolve({ ok: false, reason: 'expired' });
  if (Date.now() > rec.expiresAt) return Promise.resolve({ ok: false, reason: 'expired' });
  rec.attempts += 1;
  if (rec.attempts > MAX_ATTEMPTS)
    return Promise.resolve({ ok: false, reason: 'too_many_attempts' });
  if (rec.code !== code) return Promise.resolve({ ok: false, reason: 'invalid' });
  store.delete(email);
  return Promise.resolve({ ok: true });
}
