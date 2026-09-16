'use client';

/**
 * 실제 인증 API(`/api/auth/*`) 호출 래퍼. 서버가 비밀번호 해싱/세션 쿠키 발급을 전담하고,
 * 여기서는 fetch 로 감싸기만 한다 (화면에서 fetch 를 직접 부르지 않는다 — docs/ARCHITECTURE.md).
 */

export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  nickname: string | null;
  name: string;
}

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; message: string };

interface RegisterProfile {
  email: string;
  password: string;
  username: string;
  nickname: string;
  name: string;
  avatarUrl?: string;
}

async function postJson(url: string, body: unknown): Promise<AuthResult> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    return { ok: false, message: data?.message ?? '요청을 처리하지 못했습니다.' };
  }
  return { ok: true, user: data.user as AuthUser };
}

export function registerUser(profile: RegisterProfile): Promise<AuthResult> {
  return postJson('/api/auth/register', profile);
}

export function loginUser(email: string, password: string): Promise<AuthResult> {
  return postJson('/api/auth/login', { email, password });
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const res = await fetch(`/api/auth/check-username?value=${encodeURIComponent(username)}`);
  const data = await res.json().catch(() => null);
  return Boolean(data?.taken);
}

export async function isNicknameTaken(nickname: string): Promise<boolean> {
  const res = await fetch(`/api/auth/check-nickname?value=${encodeURIComponent(nickname)}`);
  const data = await res.json().catch(() => null);
  return Boolean(data?.taken);
}
