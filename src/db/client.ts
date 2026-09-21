import 'server-only';

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import * as schema from './schema';

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 환경변수가 없습니다.');
  }
  /** Supabase 의 pooled 연결(Supavisor, transaction mode)은 prepared statement 를
   * 지원하지 않는다 — prepare:false 없이 쓰면 캐시된 prepared statement 가 다른
   * 커넥션에서 재사용되며 에러가 난다. */
  /** Supabase pooler 인증서 체인이 Node 의 기본 신뢰 저장소와 안 맞아 verify-full 이면
   * "self-signed certificate in certificate chain" 로 실패한다 — require 로 암호화만 하고
   * CA 검증은 건너뛴다(Supabase 도 이 방식을 권장). */
  const client = postgres(databaseUrl, { prepare: false, idle_timeout: 20, ssl: 'require' });
  return drizzle(client, { schema });
}

type Database = ReturnType<typeof createDb>;

let cached: Database | null = null;

/** DATABASE_URL 이 없으면 즉시 던지지 않고 실제로 쿼리를 실행할 때(요청 처리 시점)까지
 * 미룬다 — 이 모듈은 API 라우트가 import 만 해도 Next.js 빌드의 "Collecting page data"
 * 단계에서 평가되는데, 그때는 DATABASE_URL 이 아직 준비되지 않았을 수 있어 모듈 평가
 * 시점에 던지면 그 라우트를 쓰지 않아도 빌드 자체가 실패했다. */
function getDb(): Database {
  if (!cached) cached = createDb();
  return cached;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, real);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
