'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './SectionReveal.module.css';

interface SectionRevealProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * 섹션이 스크롤로 뷰포트에 들어오면 아래에서 위로 fade-in, 벗어나면 다시 fade-out 시킨다.
 * 스크롤을 올렸다가 다시 내려도 매번 재실행된다.
 */
export function SectionReveal({ className, children }: SectionRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.visible : ''} ${className ?? ''}`}
    >
      {children}
    </section>
  );
}
