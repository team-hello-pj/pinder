'use client';

import { useTheme } from '@/components/providers/ThemeProvider';

import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      title="테마 전환"
      aria-label={isDark ? '밝은 테마로 전환' : '어두운 테마로 전환'}
      suppressHydrationWarning
    >
      {isDark ? (
        '☀'
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- 정적 16px 아이콘, next/image 최적화 불필요
        <img src="/icons/moon-icon.png" alt="" className={styles.moonIcon} />
      )}
    </button>
  );
}
