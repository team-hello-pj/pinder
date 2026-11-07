import { NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { users } from '@/db/schema';
import { compareHash } from '@/lib/server/hash';
import { getClientIp, hitRateLimit, resetRateLimit } from '@/lib/server/rate-limit';
import { createSessionCookie } from '@/lib/server/session';

export const runtime = 'nodejs';

/** 무차별 대입 방어 — 같은 계정은 15분에 10번, 같은 IP는 15분에 30번까지만 시도할 수 있다. */
const WINDOW_SEC = 15 * 60;
const MAX_ATTEMPTS_PER_ACCOUNT = 10;
const MAX_ATTEMPTS_PER_IP = 30;

/** 없는 계정·비번 오류·구글 전용 계정을 구분할 수 없게 실패 응답을 하나로 통일한다(사용자 열거 방지). */
const INVALID_CREDENTIALS = '아이디 또는 비밀번호가 올바르지 않습니다.';

/** 존재하지 않는 계정일 때도 bcrypt 비교를 한 번 돌려, 응답 시간으로 계정 존재 여부가 드러나지 않게 한다. */
const DUMMY_HASH = '$2b$10$4oF/NLfAhe/83FieLMDKseQsFEIWLdcr0GKSSF0CXt6BUjar/RP1u';

function invalidCredentials() {
  return NextResponse.json({ ok: false, message: INVALID_CREDENTIALS }, { status: 401 });
}

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

  const accountKey = `login:account:${identifier.trim().toLowerCase().slice(0, 100)}`;
  const [ipLimit, accountLimit] = await Promise.all([
    hitRateLimit(`login:ip:${getClientIp(request)}`, MAX_ATTEMPTS_PER_IP, WINDOW_SEC),
    hitRateLimit(accountKey, MAX_ATTEMPTS_PER_ACCOUNT, WINDOW_SEC),
  ]);
  if (!ipLimit.allowed || !accountLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfterSec, accountLimit.retryAfterSec);
    return NextResponse.json(
      {
        ok: false,
        message: `로그인 시도가 너무 많아요. ${Math.ceil(retryAfter / 60)}분 뒤에 다시 시도해주세요.`,
      },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const [account] = await db
    .select()
    .from(users)
    .where(or(eq(users.username, identifier), eq(users.email, identifier)))
    .limit(1);

  const matches = await compareHash(password, account?.passwordHash ?? DUMMY_HASH);
  if (!account || !account.passwordHash || !matches) return invalidCredentials();

  await resetRateLimit(accountKey);

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
