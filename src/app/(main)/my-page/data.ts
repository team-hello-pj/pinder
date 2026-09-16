// legacy/My Page.dc.html 의 NOTIFICATION_DEFS / TERMS_SECTIONS 를 그대로 옮겼다.

export interface NotificationDef {
  key: string;
  emoji: string;
  title: string;
  desc: string;
}

export const NOTIFICATION_DEFS: NotificationDef[] = [
  {
    key: 'schedule',
    emoji: '📅',
    title: '일정 알림',
    desc: '여행 일정과 계획된 활동을 미리 알려드려요.',
  },
  {
    key: 'scheduleStart',
    emoji: '📍',
    title: '일정 시작 알림',
    desc: '다음 일정이 시작되기 전에 알려드려요.',
  },
  { key: 'route', emoji: '🚶', title: '동선 알림', desc: '최적 동선 및 이동 정보를 알려드려요.' },
  {
    key: 'communityComment',
    emoji: '💬',
    title: '커뮤니티 알림',
    desc: '내 게시물의 댓글, 대댓글 활동을 알려드려요.',
  },
  {
    key: 'like',
    emoji: '❤️',
    title: '좋아요 알림',
    desc: '내 댓글이나 게시물에 좋아요가 눌리면 알려드려요.',
  },
  {
    key: 'serviceNews',
    emoji: '📢',
    title: '서비스 소식',
    desc: '새로운 기능 및 서비스 관련 소식을 알려드려요.',
  },
];

export type NotificationPrefs = Record<string, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  schedule: true,
  scheduleStart: true,
  route: true,
  communityComment: true,
  like: true,
  serviceNews: false,
};

export interface TermsSection {
  title: string;
  body: string;
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '이용약관',
    body: 'p:nder 서비스 이용에 관한 기본적인 사항을 규정합니다.\n서비스를 이용함으로써 본 약관에 동의한 것으로 간주됩니다.',
  },
  {
    title: '개인정보 처리방침',
    body: '수집 항목: 이메일, 닉네임, 프로필 사진, 여행 일정 정보\n수집 목적: 서비스 제공, 계정 관리, 맞춤 추천\n보관 기간: 회원 탈퇴 시까지 (관련 법령에 따라 일부 정보는 별도 보관)',
  },
  {
    title: '위치기반서비스 이용약관',
    body: '동선 자동 생성 및 지도 표시를 위해 입력한 장소의 위치 정보를 활용합니다.\n위치 정보는 경로 계산 목적 외에 사용되지 않습니다.',
  },
];

export const NICKNAME_RULES = { min: 2, max: 12, pattern: /^[가-힣a-zA-Z0-9_]+$/ };

/** MOCK: 다른 사용자가 이미 쓰는 닉네임. 실제 연동 시 서버 중복확인 API로 교체. */
export const TAKEN_NICKNAMES = ['관리자', '다연', '옐'];
