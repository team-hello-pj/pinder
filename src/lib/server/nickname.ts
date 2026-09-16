import 'server-only';

import { and, eq, gt, ne } from 'drizzle-orm';

import { NICKNAME_RULES, TAKEN_NICKNAMES } from '@/app/(main)/my-page/data';
import { db } from '@/db/client';
import { nicknameHistory, users } from '@/db/schema';

export interface NicknameCheckResult {
  available: boolean;
  reason: 'invalid' | 'same_as_current' | 'taken' | 'protected' | 'ok';
  message: string;
}

const PROTECTION_DAYS = 7;

export function validateNicknameFormat(raw: string): string | null {
  const n = (raw || '').trim();
  if (!n) return '닉네임을 입력해주세요.';
  if (n.length < NICKNAME_RULES.min || n.length > NICKNAME_RULES.max) {
    return `닉네임은 ${NICKNAME_RULES.min}~${NICKNAME_RULES.max}자로 입력해주세요.`;
  }
  if (!NICKNAME_RULES.pattern.test(n)) return '한글, 영문, 숫자, _만 사용할 수 있어요.';
  return null;
}

export async function evaluateNickname(
  nickname: string,
  userId: string,
  currentNickname: string | null,
): Promise<NicknameCheckResult> {
  const n = nickname.trim();
  const formatError = validateNicknameFormat(n);
  if (formatError) return { available: false, reason: 'invalid', message: formatError };
  if (n === currentNickname) {
    return { available: true, reason: 'same_as_current', message: '현재 사용 중인 닉네임이에요.' };
  }
  if (TAKEN_NICKNAMES.includes(n)) {
    return { available: false, reason: 'taken', message: '이미 사용 중인 닉네임이에요.' };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.nickname, n))
    .limit(1);
  if (existing)
    return { available: false, reason: 'taken', message: '이미 사용 중인 닉네임이에요.' };

  const [protectedEntry] = await db
    .select({ id: nicknameHistory.id })
    .from(nicknameHistory)
    .where(
      and(
        eq(nicknameHistory.nickname, n),
        ne(nicknameHistory.userId, userId),
        gt(nicknameHistory.reusableAt, new Date()),
      ),
    )
    .limit(1);
  if (protectedEntry) {
    return { available: false, reason: 'protected', message: '사용할 수 없는 닉네임이에요.' };
  }

  return { available: true, reason: 'ok', message: '사용 가능한 닉네임이에요.' };
}

export async function changeNickname(
  userId: string,
  currentNickname: string | null,
  nextNickname: string,
): Promise<{ ok: true; nickname: string } | { ok: false; message: string }> {
  const n = nextNickname.trim();
  const recheck = await evaluateNickname(n, userId, currentNickname);
  if (!recheck.available && recheck.reason !== 'same_as_current') {
    return { ok: false, message: recheck.message };
  }

  if (n !== currentNickname) {
    await db.update(users).set({ nickname: n }).where(eq(users.id, userId));
    if (currentNickname) {
      const changedAt = new Date();
      await db.insert(nicknameHistory).values({
        nickname: currentNickname,
        userId,
        changedAt,
        reusableAt: new Date(changedAt.getTime() + PROTECTION_DAYS * 24 * 60 * 60 * 1000),
      });
    }
  }

  return { ok: true, nickname: n };
}
