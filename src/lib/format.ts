/** 분 단위 숫자를 "1시간 20분" 형태로 표시한다. 내부 계산값은 항상 분(number)으로 유지한다. */
export function formatDuration(mins: number): string {
  const m = Math.round(mins || 0);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}시간` : `${h}시간 ${rest}분`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/** 여행 시작/종료일로 총 일수를 센다. 값이 없으면 1일로 본다. */
export function tripDayCount(start: string, end: string): number {
  if (!start || !end) return 1;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  const diff = Math.round((b - a) / 86_400_000);
  return diff > 0 ? diff + 1 : 1;
}

/** 타임스탬프(ms)를 "방금"/"N분 전"/"N시간 전"/"N일 전" 형태로 표시한다. */
export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, (Date.now() - timestamp) / 1000);
  if (diffSec < 60) return '방금';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

/** 배열을 n 개의 묶음으로 균등 분배한다. (일자별 방문지 나누기) */
export function chunkEven<T>(arr: T[], n: number): T[][] {
  const chunks: T[][] = Array.from({ length: n }, () => []);
  if (arr.length === 0) return chunks;
  arr.forEach((item, i) => chunks[Math.floor((i * n) / arr.length)].push(item));
  return chunks;
}
