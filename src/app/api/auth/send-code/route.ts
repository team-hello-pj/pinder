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

export async function POST(request: Request) {
  const { email } = ((await request.json().catch(() => null)) ?? {}) as { email?: string };
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: '올바른 이메일을 입력해주세요.' }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: '이미 가입된 이메일이에요.' }, { status: 409 });
  }

  const result = await issueVerificationCode(email);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, cooldownRemainingSec: result.cooldownRemainingSec },
      { status: result.cooldownRemainingSec != null ? 429 : 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    cooldownSec: RESEND_COOLDOWN_SEC,
    expiresInSec: CODE_TTL_SEC,
  });
}
