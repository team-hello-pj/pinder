import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { emailVerificationCodes } from '@/db/schema';
import { sendVerificationEmail } from '@/lib/server/email';
import { hash } from '@/lib/server/hash';

export const CODE_TTL_SEC = 300;
export const RESEND_COOLDOWN_SEC = 60;

/** 인증번호를 만들어 저장하고 이메일로 보낸다. 회원가입/비밀번호 재설정 둘 다 이 함수를 쓴다. */
export async function issueVerificationCode(
  email: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await hash(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_SEC * 1000);

  await db
    .insert(emailVerificationCodes)
    .values({ email, codeHash, expiresAt, attempts: 0, verifiedAt: null })
    .onConflictDoUpdate({
      target: emailVerificationCodes.email,
      set: { codeHash, expiresAt, attempts: 0, verifiedAt: null },
    });

  try {
    await sendVerificationEmail(email, code);
  } catch {
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, email));
    return { ok: false, message: '이메일 발송에 실패했습니다.' };
  }
  return { ok: true };
}
