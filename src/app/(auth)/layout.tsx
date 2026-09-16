import styles from './auth.module.css';

/** 로그인/회원가입 화면 공통 배경. 나머지 레이아웃(로고, 폭)은 각 화면이 직접 구성한다. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.wrap}>{children}</div>;
}
