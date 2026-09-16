import { NextResponse } from 'next/server';

import { changeNickname, evaluateNickname } from '@/lib/server/nickname';
import { createSessionCookie, getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

/** 닉네임 중복확인. */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { nickname } = ((await request.json().catch(() => null)) ?? {}) as { nickname?: string };
  if (!nickname) return NextResponse.json({ error: '닉네임을 입력해주세요.' }, { status: 400 });

  const result = await evaluateNickname(nickname, session.id, session.nickname);
  return NextResponse.json(result);
}

/** 닉네임 변경. 세션 쿠키에도 새 닉네임을 반영해서 다시 발급한다. */
export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 });

  const { nickname } = ((await request.json().catch(() => null)) ?? {}) as { nickname?: string };
  if (!nickname) {
    return NextResponse.json({ ok: false, message: '닉네임을 입력해주세요.' }, { status: 400 });
  }

  const result = await changeNickname(session.id, session.nickname, nickname);
  if (!result.ok) return NextResponse.json(result, { status: 409 });

  const nextUser = { ...session, nickname: result.nickname };
  await createSessionCookie(nextUser);
  return NextResponse.json({ ok: true, nickname: result.nickname, user: nextUser });
}
