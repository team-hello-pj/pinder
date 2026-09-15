import { NICKNAME_RULES, TAKEN_NICKNAMES } from '@/app/(main)/my-page/data';

/**
 * 닉네임 중복확인/변경 목업 서비스.
 * legacy/My Page.dc.html 의 검증 규칙을 그대로 옮겼다.
 * 실제 백엔드 연동 시 checkNickname/updateNickname 본문만 API 호출로 교체하면 된다.
 */

export interface NicknameCheckResult {
  available: boolean;
  reason: 'invalid' | 'same_as_current' | 'taken' | 'protected' | 'ok';
  message: string;
}

interface NicknameHistoryEntry {
  nickname: string;
  userId: string;
  changedAt: number;
  /** 변경 후 7일간은 다른 사람이 같은 닉네임을 다시 쓸 수 없다. */
  reusableAt: number;
}

// 목업 인메모리 상태 — 실제 서비스에서는 서버가 들고 있을 데이터.
const nicknameHistory: NicknameHistoryEntry[] = [];

export function validateNicknameFormat(raw: string): string | null {
  const n = (raw || '').trim();
  if (!n) return '닉네임을 입력해주세요.';
  if (n.length < NICKNAME_RULES.min || n.length > NICKNAME_RULES.max) {
    return `닉네임은 ${NICKNAME_RULES.min}~${NICKNAME_RULES.max}자로 입력해주세요.`;
  }
  if (!NICKNAME_RULES.pattern.test(n)) return '한글, 영문, 숫자, _만 사용할 수 있어요.';
  return null;
}

export async function checkNickname(
  nickname: string,
  userId: string,
  currentNickname: string,
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
  const now = Date.now();
  const protectedEntry = nicknameHistory.find(
    (h) => h.nickname === n && h.userId !== userId && h.reusableAt > now,
  );
  if (protectedEntry)
    return { available: false, reason: 'protected', message: '사용할 수 없는 닉네임이에요.' };
  return { available: true, reason: 'ok', message: '사용 가능한 닉네임이에요.' };
}

export async function updateNickname(
  userId: string,
  prevNickname: string,
  nextNickname: string,
): Promise<{ ok: true; nickname: string } | { ok: false; message: string }> {
  // 저장 직전에 다시 확인 — 그 사이 다른 사용자가 선점했을 수 있다.
  const recheck = await checkNickname(nextNickname, userId, prevNickname);
  if (!recheck.available && recheck.reason !== 'same_as_current') {
    return { ok: false, message: recheck.message };
  }
  if (nextNickname !== prevNickname) {
    const changedAt = Date.now();
    nicknameHistory.push({
      nickname: prevNickname,
      userId,
      changedAt,
      reusableAt: changedAt + 7 * 24 * 60 * 60 * 1000,
    });
  }
  // TODO(backend): await fetch('/api/account/nickname', { method: 'PATCH', body: JSON.stringify({ userId, nickname: nextNickname }) })
  return { ok: true, nickname: nextNickname };
}
