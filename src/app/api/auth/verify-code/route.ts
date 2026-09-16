import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { emailVerificationCodes } from '@/db/schema';
import { compareHash } from '@/lib/server/hash';

export const runtime = 'nodejs';

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const { email, code } = ((await request.json().catch(() => null)) ?? {}) as {
    email?: string;
    code?: string;
  };
  if (!email || !code) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });
  }

  const [record] = await db
    .select()
    .from(emailVerificationCodes)
    .where(eq(emailVerificationCodes.email, email))
    .limit(1);

  if (!record || record.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, reason: 'expired' });
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ ok: false, reason: 'too_many_attempts' });
  }

  const matches = await compareHash(code, record.codeHash);
  if (!matches) {
    await db
      .update(emailVerificationCodes)
      .set({ attempts: record.attempts + 1 })
      .where(eq(emailVerificationCodes.email, email));
    return NextResponse.json({ ok: false, reason: 'invalid' });
  }

  await db
    .update(emailVerificationCodes)
    .set({ verifiedAt: new Date() })
    .where(eq(emailVerificationCodes.email, email));

  return NextResponse.json({ ok: true });
}
