'use client';

import { useEffect, useRef } from 'react';

import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * 공통 모달. <dialog> 를 쓰므로 포커스 트랩과 ESC 닫기를 브라우저가 처리한다.
 * 화면마다 따로 모달 마크업을 만들지 말고 이 컴포넌트를 재사용할 것.
 */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} onCancel={onClose} onClose={onClose}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </dialog>
  );
}
