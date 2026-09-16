import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { users } from '@/db/schema';
import {
  CODE_TTL_SEC,
  RESEND_COOLDOWN_SEC,
  issueVerificationCode,
} from '@/lib/server/verification-code';

export const runtime = 'nodejs';

/** 회원가입과 반대로, 이미 가입된 계정일 때만 인증번호를 보낸다. */
export async function POST(request: Request) {
  const { email } = ((await request.json().catch(() => null)) ?? {}) as { email?: string };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: '올바른 이메일을 입력해주세요.' }, { status: 400 });
  }

  const [account] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!account) {
    return NextResponse.json({ error: '가입된 계정을 찾을 수 없어요.' }, { status: 404 });
  }
  if (!account.passwordHash) {
    return NextResponse.json(
      { error: '구글 로그인으로 가입된 계정이에요. 구글 로그인을 이용해주세요.' },
      { status: 400 },
    );
  }

  const result = await issueVerificationCode(email);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 502 });

  return NextResponse.json({
    ok: true,
    cooldownSec: RESEND_COOLDOWN_SEC,
    expiresInSec: CODE_TTL_SEC,
  });
}
