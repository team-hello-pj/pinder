import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { emailVerificationCodes, users } from '@/db/schema';
import { hash } from '@/lib/server/hash';
import { createSessionCookie } from '@/lib/server/session';

export const runtime = 'nodejs';

const VERIFIED_TTL_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  const { email, password } = ((await request.json().catch(() => null)) ?? {}) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    return NextResponse.json({ ok: false, message: '모든 항목을 입력해주세요.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, message: '비밀번호는 8자 이상 입력해주세요.' },
      { status: 400 },
    );
  }

  const [verification] = await db
    .select()
    .from(emailVerificationCodes)
    .where(eq(emailVerificationCodes.email, email))
    .limit(1);
  if (
    !verification?.verifiedAt ||
    Date.now() - verification.verifiedAt.getTime() > VERIFIED_TTL_MS
  ) {
    return NextResponse.json(
      { ok: false, message: '이메일 인증을 완료해주세요.' },
      { status: 400 },
    );
  }

  const passwordHash = await hash(password);
  const [account] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.email, email))
    .returning({
      id: users.id,
      email: users.email,
      username: users.username,
      nickname: users.nickname,
      name: users.name,
    });
  if (!account) {
    return NextResponse.json({ ok: false, message: '계정을 찾을 수 없습니다.' }, { status: 404 });
  }

  await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, email));
  await createSessionCookie(account);

  return NextResponse.json({ ok: true, user: account });
}
