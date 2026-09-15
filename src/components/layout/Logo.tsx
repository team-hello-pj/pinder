import Link from 'next/link';

import { ROUTES } from '@/constants';

import styles from './Logo.module.css';

/** p:nder 워드마크. 콜론만 브랜드 색으로 강조한다. */
export function Logo({ href = ROUTES.home }: { href?: string }) {
  return (
    <Link href={href} className={styles.logo} aria-label="p:nder 홈">
      p<span className={styles.colon}>:</span>nder
    </Link>
  );
}
