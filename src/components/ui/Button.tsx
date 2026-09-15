import type { ButtonHTMLAttributes } from 'react';

import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/** 서비스 전역 버튼. 새 버튼 스타일이 필요하면 variant 를 추가하고 개별 CSS 는 만들지 않는다. */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={classes} {...rest} />;
}
