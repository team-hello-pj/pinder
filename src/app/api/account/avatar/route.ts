import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { users } from '@/db/schema';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// data URL 문자열 길이 제한 — 리사이즈된 이미지 기준으로 넉넉히 잡는다 (원본 대용량 업로드 방지).
const MAX_DATA_URL_LENGTH = 2_000_000;

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ avatarUrl: null });

  const [row] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);
  return NextResponse.json({ avatarUrl: row?.avatarUrl ?? null });
}

export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { dataUrl } = ((await request.json().catch(() => null)) ?? {}) as { dataUrl?: string };
  if (!dataUrl || !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(dataUrl)) {
    return NextResponse.json({ error: '이미지 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: '이미지 용량이 너무 큽니다.' }, { status: 400 });
  }

  await db.update(users).set({ avatarUrl: dataUrl }).where(eq(users.id, session.id));
  return NextResponse.json({ ok: true, avatarUrl: dataUrl });
}

export async function DELETE() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  await db.update(users).set({ avatarUrl: null }).where(eq(users.id, session.id));
  return NextResponse.json({ ok: true });
}
