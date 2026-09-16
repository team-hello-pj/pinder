import styles from './PlaceholderImage.module.css';

export interface PlaceholderImageProps {
  /** 대체 텍스트로도 쓰이는, 화면에 보이는 라벨 (예: 장소명) */
  label: string;
  className?: string;
}

/**
 * 실제 이미지 자산이 없는 카드에 쓰는 자리표시자.
 * 레거시의 `<image-slot>` (캔버스 에디터에서 이미지를 붙여넣던 자리)을 대신한다.
 * TODO(자산 담당): 실제 이미지 업로드/CDN 연동 시 이 컴포넌트를 <Image> 로 교체.
 */
export function PlaceholderImage({ label, className }: PlaceholderImageProps) {
  return (
    <div
      className={[styles.wrap, className].filter(Boolean).join(' ')}
      role="img"
      aria-label={label}
    >
      <span className={styles.icon} aria-hidden>
        🖼
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
