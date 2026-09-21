import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 환경변수가 없습니다.');
  }
  return drizzle(neon(databaseUrl), { schema });
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
