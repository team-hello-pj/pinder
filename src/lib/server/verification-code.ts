import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { emailVerificationCodes } from '@/db/schema';
import { sendVerificationEmail } from '@/lib/server/email';
import { hash } from '@/lib/server/hash';

export const CODE_TTL_SEC = 300;
export const RESEND_COOLDOWN_SEC = 60;

/**
 * 인증번호를 만들어 저장하고 이메일로 보낸다. 회원가입/비밀번호 재설정 둘 다 이 함수를 쓴다.
 * `createdAt`을 "마지막 발송 시각"으로 재활용해 재전송 쿨다운을 서버에서도 강제한다 —
 * 프런트 버튼 비활성화만 믿으면 더블클릭/중복 요청으로 메일이 여러 통 나가버린다.
 */
export async function issueVerificationCode(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string; cooldownRemainingSec?: number }> {
  const [existing] = await db
    .select({ createdAt: emailVerificationCodes.createdAt })
    .from(emailVerificationCodes)
    .where(eq(emailVerificationCodes.email, email))
    .limit(1);
  if (existing) {
    const elapsedSec = (Date.now() - existing.createdAt.getTime()) / 1000;
    if (elapsedSec < RESEND_COOLDOWN_SEC) {
      return {
        ok: false,
        message: '잠시 후 다시 시도해주세요.',
        cooldownRemainingSec: Math.ceil(RESEND_COOLDOWN_SEC - elapsedSec),
      };
    }
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await hash(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_SEC * 1000);

  await db
    .insert(emailVerificationCodes)
    .values({ email, codeHash, expiresAt, attempts: 0, verifiedAt: null, createdAt: now })
    .onConflictDoUpdate({
      target: emailVerificationCodes.email,
      set: { codeHash, expiresAt, attempts: 0, verifiedAt: null, createdAt: now },
    });

  try {
    await sendVerificationEmail(email, code);
  } catch {
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, email));
    return { ok: false, message: '이메일 발송에 실패했습니다.' };
  }
  return { ok: true };
}
