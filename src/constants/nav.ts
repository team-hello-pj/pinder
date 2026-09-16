export interface NavItem {
  href: string;
  label: string;
}

/** 헤더 전역 내비게이션. 경로를 추가할 때는 여기만 고치면 모든 화면에 반영된다. */
export const MAIN_NAV: NavItem[] = [
  { href: '/explore', label: '여행지 탐색' },
  { href: '/routes', label: '내 일정' },
  { href: '/community', label: '커뮤니티' },
];

export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  explore: '/explore',
  routes: '/routes',
  planner: '/planner',
  community: '/community',
  myPage: '/my-page',
} as const;
