/** 이름 문자열을 해시해 고정된 색을 배정한다 (아바타가 없는 멤버 이니셜 배지용). */

const AVATAR_COLORS = ['#7bcb93', '#8fb6e8', '#e8a87c', '#b79be8'];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

export function avatarColorFor(name: string): string {
  return AVATAR_COLORS[Math.abs(hashStr(name)) % AVATAR_COLORS.length];
}
