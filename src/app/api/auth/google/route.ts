import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { emailVerificationCodes, users } from '@/db/schema';
import { verifyGoogleCredential } from '@/lib/server/google';
import { hash } from '@/lib/server/hash';
import { createSessionCookie } from '@/lib/server/session';

export const runtime = 'nodejs';

/** 회원가입 화면에서 이메일 인증 단계를 건너뛸 수 있게 해주는 유효 시간 (register 라우트의 TTL과 맞춘다). */
const GOOGLE_VERIFIED_TTL_MS = 30 * 60 * 1000;

export async function POST(request: Request) {
  const { credential } = ((await request.json().catch(() => null)) ?? {}) as {
    credential?: string;
  };
  if (!credential) {
    return NextResponse.json({ error: '구글 인증 정보가 없습니다.' }, { status: 400 });
  }

  const profile = await verifyGoogleCredential(credential);
  if (!profile) {
    return NextResponse.json({ error: '구글 로그인을 확인하지 못했어요.' }, { status: 401 });
  }

  const [byGoogleId] = await db
    .select()
    .from(users)
    .where(eq(users.googleId, profile.googleId))
    .limit(1);

  let account = byGoogleId;

  if (!account) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);
    if (byEmail) {
      [account] = await db
        .update(users)
        .set({ googleId: profile.googleId })
        .where(eq(users.id, byEmail.id))
        .returning();
    }
  }

  if (account) {
    // 이미 있는 계정 — 바로 로그인.
    const user = {
      id: account.id,
      email: account.email,
      username: account.username,
      nickname: account.nickname,
      name: account.name,
    };
    await createSessionCookie(user);
    return NextResponse.json({ ok: true, user });
  }

  // 처음 구글로 로그인한 경우: 계정을 바로 만들지 않고, 이메일 인증만 완료된 상태로
  // 회원가입 화면으로 넘겨서 아이디/별명/비밀번호는 직접 입력하게 한다.
  const codeHash = await hash(crypto.randomUUID());
  const expiresAt = new Date(Date.now() + GOOGLE_VERIFIED_TTL_MS);
  await db
    .insert(emailVerificationCodes)
    .values({ email: profile.email, codeHash, expiresAt, attempts: 0, verifiedAt: new Date() })
    .onConflictDoUpdate({
      target: emailVerificationCodes.email,
      set: { codeHash, expiresAt, attempts: 0, verifiedAt: new Date() },
    });

  return NextResponse.json({
    ok: true,
    needsSignup: true,
    email: profile.email,
    name: profile.name,
  });
}
