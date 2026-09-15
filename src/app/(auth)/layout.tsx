import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

import styles from './auth.module.css';

/** 로그인/회원가입 전용 레이아웃. 전역 헤더 대신 로고와 테마 토글만 둔다. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <Logo />
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  );
}
