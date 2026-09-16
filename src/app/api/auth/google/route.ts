import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { users } from '@/db/schema';
import { sendWelcomeEmail } from '@/lib/server/email';
import { verifyGoogleCredential } from '@/lib/server/google';
import { createSessionCookie } from '@/lib/server/session';

export const runtime = 'nodejs';

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
  let isNewAccount = false;

  if (!account) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);

    if (byEmail) {
      [account] = await db
        .update(users)
        .set({ googleId: profile.googleId })
        .where(eq(users.id, byEmail.id))
        .returning();
    } else {
      [account] = await db
        .insert(users)
        .values({
          email: profile.email,
          name: profile.name,
          googleId: profile.googleId,
          emailVerifiedAt: new Date(),
        })
        .returning();
      isNewAccount = true;
    }
  }

  const user = {
    id: account.id,
    email: account.email,
    username: account.username,
    nickname: account.nickname,
    name: account.name,
  };
  await createSessionCookie(user);
  if (isNewAccount) await sendWelcomeEmail(user.email, user.name);
  return NextResponse.json({ ok: true, user });
}
