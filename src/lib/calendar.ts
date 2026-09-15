/**
 * 날짜 범위 선택용 미니 달력 그리드 계산.
 * legacy/My Routes.dc.html 의 buildCalCells 를 그대로 옮겼다 — 새 일정 모달과
 * 카드 내 날짜 수정 팝오버 양쪽에서 재사용한다.
 */

export interface CalCell {
  day: number;
  dateStr: string;
  onClick: () => void;
  /** 선택 범위 배경색 */
  rangeBg: string;
  /** 범위 시작/끝/중간에 따른 border-radius */
  rangeRadius: string;
  textColor: string;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 2026년 대한민국 공휴일 목업 — 실제로는 공휴일 API로 교체 가능.
const HOLIDAYS = new Set([
  '2026-01-01',
  '2026-02-16',
  '2026-02-17',
  '2026-02-18',
  '2026-03-01',
  '2026-03-02',
  '2026-05-05',
  '2026-05-24',
  '2026-06-06',
  '2026-08-15',
  '2026-08-17',
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-10-03',
  '2026-10-05',
  '2026-10-09',
  '2026-12-25',
]);

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function fmtDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${y}.${pad2(m)}.${pad2(d)} (${WEEKDAY_LABELS[dt.getDay()]})`;
}

export function fmtRange(start: string, end: string): string {
  if (!start) return '';
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  if (!end || end === start) return fmt(start);
  return `${fmt(start)} - ${fmt(end)}`;
}

export function weekdayLabels(isDark: boolean): { label: string; color: string }[] {
  return WEEKDAY_LABELS.map((label, i) => ({
    label,
    color: i === 0 ? '#e5484d' : i === 6 ? '#0066ff' : isDark ? '#ffffff' : 'var(--pd-text-sub)',
  }));
}

export function buildCalCells(
  viewYear: number,
  viewMonth: number,
  startStr: string,
  endStr: string,
  onDayClick: (dateStr: string) => void,
): CalCell[] {
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const toStr = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

  const raw: { day: number; dateStr: string; inMonth: boolean }[] = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    let y = viewYear;
    let m = viewMonth - 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    raw.push({ day: d, dateStr: toStr(y, m, d), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++)
    raw.push({ day: d, dateStr: toStr(viewYear, viewMonth, d), inMonth: true });
  while (raw.length % 7 !== 0 || raw.length < 42) {
    const idx = raw.length - (firstDow + daysInMonth);
    const d = idx + 1;
    let y = viewYear;
    let m = viewMonth + 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    raw.push({ day: d, dateStr: toStr(y, m, d), inMonth: false });
  }

  return raw.map((cell, i) => {
    const dow = i % 7;
    const isStart = cell.dateStr === startStr;
    const isEnd = cell.dateStr === endStr;
    const isRangeActive = Boolean(startStr && endStr);
    const inRange = isRangeActive && cell.dateStr > startStr && cell.dateStr < endStr;
    const isEdge = isStart || isEnd;
    const isHoliday = HOLIDAYS.has(cell.dateStr);
    const dayColor = !cell.inMonth
      ? '#c9cacd'
      : dow === 0 || isHoliday
        ? '#e5484d'
        : dow === 6
          ? '#0066ff'
          : 'var(--pd-text)';
    const selected = (isRangeActive && (isEdge || inRange)) || (!isRangeActive && isStart);

    return {
      day: cell.day,
      dateStr: cell.dateStr,
      onClick: cell.inMonth ? () => onDayClick(cell.dateStr) : () => {},
      rangeBg: selected ? '#95c898' : 'transparent',
      rangeRadius: !isRangeActive
        ? '8px'
        : isStart && isEnd
          ? '8px'
          : isStart
            ? '8px 0 0 8px'
            : isEnd
              ? '0 8px 8px 0'
              : inRange
                ? '0'
                : '8px',
      textColor: selected ? '#12321f' : dayColor,
    };
  });
}
