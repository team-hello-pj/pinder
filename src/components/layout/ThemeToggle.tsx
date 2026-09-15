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
      {isDark ? '☀' : '☾'}
    </button>
  );
}
