import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { emailVerificationCodes } from '@/db/schema';
import { hash } from '@/lib/server/hash';
import { sendVerificationEmail } from '@/lib/server/email';

export const runtime = 'nodejs';

const CODE_TTL_SEC = 300;
const RESEND_COOLDOWN_SEC = 60;

export async function POST(request: Request) {
  const { email } = ((await request.json().catch(() => null)) ?? {}) as { email?: string };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: '올바른 이메일을 입력해주세요.' }, { status: 400 });
  }

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
    return NextResponse.json({ error: '이메일 발송에 실패했습니다.' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    cooldownSec: RESEND_COOLDOWN_SEC,
    expiresInSec: CODE_TTL_SEC,
  });
}
