import Link from 'next/link';

import { ROUTES } from '@/constants';

import styles from './Logo.module.css';

export type LogoSize = 'sm' | 'md' | 'lg';

export interface LogoProps {
  href?: string;
  /** sm: 푸터, md: 헤더, lg: 로그인/회원가입 */
  size?: LogoSize;
  /** 헤더에서만 켠다 — 개미가 로고 옆을 지나가는 브랜드 애니메이션(20초 주기 반복). */
  animated?: boolean;
}

/** p:nder 워드마크. 개미 아이콘(마스크, currentColor)과 콜론 강조 텍스트로 구성된다. */
export function Logo({ href = ROUTES.home, size = 'md', animated = false }: LogoProps) {
  const markClass = [styles.mark, styles[`mark-${size}`], animated ? styles.markAnimated : '']
    .filter(Boolean)
    .join(' ');
  const textClass = [styles.text, animated ? styles.textAnimated : ''].filter(Boolean).join(' ');

  return (
    <Link href={href} className={`${styles.logo} ${styles[`logo-${size}`]}`} aria-label="p:nder 홈">
      <span className={markClass} aria-hidden />
      <span className={textClass}>
        p<span className={styles.colon}>:</span>nder
      </span>
    </Link>
  );
}
