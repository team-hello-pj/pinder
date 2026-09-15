import { clearSession } from '@/lib/storage';

import type { MockSchedule } from '@/app/(main)/my-page/data';

/**
 * 회원 탈퇴 목업 서비스. "계정 삭제"만 담당하고, 일정 삭제(경로 플래너 쪽 원본 데이터)와는
 * 완전히 분리된 흐름이다. legacy/My Page.dc.html 의 deleteAccount 를 그대로 옮겼다.
 * 실제 백엔드 연동 시 이 함수 내부만 API 호출로 교체하면 된다.
 */

export interface DeleteAccountOptions {
  /** '탈퇴하기 전에 확인해주세요' 단계에서 이미 동의를 받은 경우 creator 일정 체크를 건너뛴다. */
  skipCreatorCheck?: boolean;
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: 'has_creator_schedules'; creatorSchedules: MockSchedule[] }
  | { ok: false; reason: 'server_error' };

export async function deleteAccount(
  mySchedules: MockSchedule[],
  opts?: DeleteAccountOptions,
): Promise<DeleteAccountResult> {
  // 1) Creator 소유 일정이 남아있으면 탈퇴를 막는다 — 소유권 임의 이전/타인 데이터 삭제 금지.
  const creatorSchedules = mySchedules.filter((s) => s.role === 'creator');
  if (creatorSchedules.length > 0 && !opts?.skipCreatorCheck) {
    return { ok: false, reason: 'has_creator_schedules', creatorSchedules };
  }

  // 2) 역할별 관계 정리 — 원본 일정은 건드리지 않고 "이 계정과의 관계"만 제거한다.
  //    editor → participants 에서 이 계정만 제거, viewer → 공유 참여 관계 제거,
  //    savedViewer → 이 계정의 My Routes 저장 항목만 제거.
  // TODO(backend): await fetch('/api/account/relations', { method: 'DELETE' })

  // 3) 계정 삭제
  // TODO(backend): const res = await fetch('/api/account', { method: 'DELETE' }); if (!res.ok) return { ok: false, reason: 'server_error' };

  // 4) 로그아웃 처리
  clearSession();

  return { ok: true };
}
