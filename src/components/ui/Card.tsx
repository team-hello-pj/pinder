import type { HTMLAttributes } from 'react';

import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 마우스를 올렸을 때 살짝 떠오르는 효과. 클릭 가능한 카드에만 켠다. */
  interactive?: boolean;
}

export function Card({ interactive = false, className, ...rest }: CardProps) {
  const classes = [styles.card, interactive ? styles.interactive : '', className]
    .filter(Boolean)
    .join(' ');
  return <div className={classes} {...rest} />;
}
