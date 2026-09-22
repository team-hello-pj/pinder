import { NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { users } from '@/db/schema';
import { compareHash } from '@/lib/server/hash';
import { createSessionCookie } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { identifier, password } = ((await request.json().catch(() => null)) ?? {}) as {
    identifier?: string;
    password?: string;
  };
  if (!identifier || !password) {
    return NextResponse.json(
      { ok: false, message: '아이디와 비밀번호를 모두 입력해주세요.' },
      { status: 400 },
    );
  }

  const [account] = await db
    .select()
    .from(users)
    .where(or(eq(users.username, identifier), eq(users.email, identifier)))
    .limit(1);
  if (!account) {
    return NextResponse.json({ ok: false, message: '가입된 회원이 아닙니다.' }, { status: 401 });
  }
  if (!account.passwordHash) {
    return NextResponse.json(
      { ok: false, message: '구글 로그인으로 가입된 계정이에요. 구글 로그인을 이용해주세요.' },
      { status: 401 },
    );
  }

  const matches = await compareHash(password, account.passwordHash);
  if (!matches) {
    return NextResponse.json(
      { ok: false, message: '아이디/비밀번호가 틀렸습니다.' },
      { status: 401 },
    );
  }

  const user = {
    id: account.id,
    email: account.email,
    username: account.username,
    nickname: account.nickname,
    name: account.name,
  };
  await createSessionCookie(user);
  // avatarUrl(data URL)은 세션 쿠키에는 넣지 않고(용량 때문에) 응답에만 붙여서 돌려준다.
  return NextResponse.json({ ok: true, user: { ...user, avatarUrl: account.avatarUrl ?? null } });
}
