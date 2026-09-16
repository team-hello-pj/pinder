import { Logo } from './Logo';
import styles from './SiteFooter.module.css';

/** 모든 화면 하단에 공통으로 붙는 푸터. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Logo size="sm" />
      <p className={styles.copyright}>
        © 2026 p<span className={styles.colon}>:</span>nder made by team_hello
      </p>
    </footer>
  );
}
