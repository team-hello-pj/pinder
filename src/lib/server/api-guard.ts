import 'server-only';

import { NextResponse } from 'next/server';

import { hitRateLimit } from './rate-limit';
import { getSessionUser, type SessionUser } from './session';

interface GuardOptions {
  /** 호출 한도 키에 들어가는 이름. 예: 'chat' → `api:chat:<userId>` */
  name: string;
  limit: number;
  windowSec: number;
}

type GuardResult =
  | { user: SessionUser; response?: undefined }
  | { user?: undefined; response: NextResponse };

/**
 * 돈이 드는 외부 API(Gemini·Kakao) 프록시 라우트용 입구 검사.
 * 로그인하지 않았으면 401, 사용자별 한도를 넘으면 429 를 돌려준다.
 * 사용법: `const guard = await guardPaidApi({...}); if (guard.response) return guard.response;`
 */
export async function guardPaidApi({ name, limit, windowSec }: GuardOptions): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) {
    return { response: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  }

  const result = await hitRateLimit(`api:${name}:${user.id}`, limit, windowSec);
  if (!result.allowed) {
    return {
      response: NextResponse.json(
        { error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(result.retryAfterSec) } },
      ),
    };
  }
  return { user };
}
