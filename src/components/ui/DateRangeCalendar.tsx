'use client';

import { buildCalCells, weekdayLabels } from '@/lib/calendar';

import styles from './DateRangeCalendar.module.css';

export interface DateRangeCalendarProps {
  year: number;
  month: number; // 0-indexed
  start: string;
  end: string;
  onDayClick: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** 'full': 새 일정 모달의 큰 달력(요일 헤더 + 원형 선택). 'compact': 카드 안 팝오버용 작은 달력. */
  variant?: 'full' | 'compact';
}

/**
 * 날짜 범위 선택 달력. 새 일정 만들기 모달과, 저장된 일정 카드의 날짜 수정 팝오버
 * 양쪽에서 재사용한다 (legacy 에서는 두 군데에 거의 같은 마크업이 중복돼 있었다).
 */
export function DateRangeCalendar({
  year,
  month,
  start,
  end,
  onDayClick,
  onPrevMonth,
  onNextMonth,
  variant = 'full',
}: DateRangeCalendarProps) {
  const cells = buildCalCells(year, month, start, end, onDayClick);
  const compact = variant === 'compact';

  return (
    <div className={styles.wrap}>
      <div className={styles.monthRow}>
        <button type="button" className={styles.navBtn} onClick={onPrevMonth} aria-label="이전 달">
          ‹
        </button>
        <span className={styles.monthLabel}>
          {compact ? `${year}년 ${month + 1}월` : `${month + 1}월`}
        </span>
        <button type="button" className={styles.navBtn} onClick={onNextMonth} aria-label="다음 달">
          ›
        </button>
      </div>

      {!compact ? (
        <div className={styles.weekdayRow}>
          {weekdayLabels(false).map((wd) => (
            <span key={wd.label} className={styles.weekday} style={{ color: wd.color }}>
              {wd.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className={compact ? styles.gridCompact : styles.grid}>
        {cells.map((cell) => (
          <button
            key={cell.dateStr}
            type="button"
            className={compact ? styles.cellCompact : styles.cell}
            style={{ background: cell.rangeBg, borderRadius: cell.rangeRadius }}
            onClick={cell.onClick}
          >
            {compact ? (
              <span style={{ color: cell.textColor }}>{cell.day}</span>
            ) : (
              <span className={styles.dayCircle} style={{ color: cell.textColor }}>
                {cell.day}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
