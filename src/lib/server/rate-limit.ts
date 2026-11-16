import 'server-only';

import { eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { rateLimits } from '@/db/schema';

export interface RateLimitResult {
  allowed: boolean;
  /** 제한에 걸렸을 때 다시 시도할 수 있기까지 남은 초. */
  retryAfterSec: number;
}

/**
 * 고정 구간(fixed window) 호출 제한. `key` 의 호출 횟수를 1 올리고 `limit` 을 넘었는지 돌려준다.
 * 구간(windowSec)이 지나면 카운터가 1부터 다시 시작한다. 한 번의 upsert 로 처리해 동시 요청에도 정확하다.
 *
 * rate_limits 테이블이 아직 없거나 DB 가 잠깐 불안정해도 서비스 전체가 멈추지 않도록,
 * 카운터 오류는 로그만 남기고 통과시킨다(fail-open). 테이블은 `npm run db:push` 로 만든다.
 */
export async function hitRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  try {
    const rows = await db.execute<{ count: number; retry_after: number }>(sql`
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (${key}, 1, now())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start <= now() - make_interval(secs => ${windowSec})
          THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE
          WHEN rate_limits.window_start <= now() - make_interval(secs => ${windowSec})
          THEN now() ELSE rate_limits.window_start END
      RETURNING
        count,
        CEIL(GREATEST(0, EXTRACT(EPOCH FROM (window_start + make_interval(secs => ${windowSec}) - now()))))::int AS retry_after
    `);
    const row = rows[0];
    if (!row) return { allowed: true, retryAfterSec: 0 };
    return { allowed: Number(row.count) <= limit, retryAfterSec: Number(row.retry_after) };
  } catch (err) {
    console.error('rate limit check failed (fail-open):', err);
    return { allowed: true, retryAfterSec: 0 };
  }
}

/** 카운터를 지운다 — 로그인에 성공하면 그 계정의 실패 횟수를 초기화하는 데 쓴다. */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await db.delete(rateLimits).where(eq(rateLimits.key, key));
  } catch (err) {
    console.error('rate limit reset failed:', err);
  }
}

/** 프록시/배포 환경이 붙여 주는 헤더에서 클라이언트 IP 를 읽는다(Vercel 은 x-forwarded-for 를 덮어쓴다). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}
