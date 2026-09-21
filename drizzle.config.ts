import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    /** DDL(스키마 push)은 pooled 연결(Supavisor transaction mode)에서 실패할 수 있어
     * direct(non-pooling) 연결을 우선 쓴다. */
    url: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)!,
    /** Supabase pooler 인증서 체인 문제로 verify-full 검증이 실패해 require 로 완화한다. */
    ssl: 'require',
  },
});
