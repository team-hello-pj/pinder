import { NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { emailVerificationCodes, users } from '@/db/schema';
import { hash } from '@/lib/server/hash';
import { createSessionCookie } from '@/lib/server/session';

export const runtime = 'nodejs';

const VERIFIED_TTL_MS = 30 * 60 * 1000;

interface RegisterBody {
  email?: string;
  password?: string;
  username?: string;
  nickname?: string;
  name?: string;
}

export async function POST(request: Request) {
  const { email, password, username, nickname, name } = ((await request.json().catch(() => null)) ??
    {}) as RegisterBody;

  if (!email || !password || !username || !nickname || !name) {
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

  const [conflict] = await db
    .select({ email: users.email, username: users.username, nickname: users.nickname })
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username), eq(users.nickname, nickname)))
    .limit(1);

  if (conflict) {
    const message =
      conflict.email === email
        ? '이미 가입된 이메일이에요.'
        : conflict.username === username
          ? '이미 사용 중인 아이디입니다.'
          : '이미 사용 중인 닉네임입니다.';
    return NextResponse.json({ ok: false, message }, { status: 409 });
  }

  const passwordHash = await hash(password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, username, nickname, name, emailVerifiedAt: new Date() })
    .returning({
      id: users.id,
      email: users.email,
      username: users.username,
      nickname: users.nickname,
      name: users.name,
    });

  await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, email));

  await createSessionCookie(user);
  return NextResponse.json({ ok: true, user });
}
