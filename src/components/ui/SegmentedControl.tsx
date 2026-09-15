'use client';

import styles from './SegmentedControl.module.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

/** 이동수단 / 경로 기준 선택에 쓰는 세그먼티드 컨트롤. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={opt.value === value}
          className={opt.value === value ? `${styles.item} ${styles.active}` : styles.item}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon ? <span aria-hidden>{opt.icon}</span> : null}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
