import 'server-only';

import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

import { db } from '@/db/client';
import { users } from '@/db/schema';

const SESSION_COOKIE = 'pd_session';
const SESSION_TTL_SEC = 60 * 60 * 24 * 30; // 30일

export interface SessionUser {
  id: string;
  email: string;
  username: string | null;
  nickname: string | null;
  name: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET 환경변수가 없습니다.');
  return new TextEncoder().encode(secret);
}

export async function createSessionCookie(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(getSecret());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SEC,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let id: string;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const decoded = payload as Record<string, unknown>;
    if (typeof decoded.id !== 'string') return null;
    id = decoded.id;
  } catch {
    return null;
  }

  // 토큰 서명만 검증하고 끝나면, DB 마이그레이션/탈퇴 등으로 이 id 의 유저가 실제로는
  // 없어졌는데도 로그인은 된 것처럼 보이는 상태가 된다 — 그 상태에서 글쓰기/좋아요처럼
  // 이 id 를 FK 로 쓰는 동작을 하면 제약 위반으로 500 이 난다. 매 요청마다 DB로 존재를
  // 확인해서, 없으면 즉시 로그아웃 처리(쿠키 삭제)하고 미인증으로 취급한다 — 그래야
  // 호출부가 401을 받아 재로그인을 유도할 수 있다. 이름/닉네임도 여기서 최신값으로 읽어
  // JWT 발급 시점 이후 프로필을 바꿔도 다음 요청부터 바로 반영되게 한다.
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      nickname: users.nickname,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!row) {
    await destroySessionCookie();
    return null;
  }

  return row;
}

export async function destroySessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
