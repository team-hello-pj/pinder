import 'server-only';

import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

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
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const { id, email, username, nickname, name } = payload as Record<string, unknown>;
    if (typeof id !== 'string' || typeof email !== 'string' || typeof name !== 'string') {
      return null;
    }
    return {
      id,
      email,
      username: typeof username === 'string' ? username : null,
      nickname: typeof nickname === 'string' ? nickname : null,
      name,
    };
  } catch {
    return null;
  }
}

export async function destroySessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
