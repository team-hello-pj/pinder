'use client';

import { PRIORITY_MAP } from '@/constants';
import type { Place } from '@/types';

import styles from './planner.module.css';

export interface PlaceCardHandlers {
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (idx: number) => void;
  onDragEnd: () => void;
  onToggleExpand: (id: number) => void;
  onDeleteClick: (id: number) => void;
  onOpenEdit: (id: number) => void;
  onOpenCategory: (id: number) => void;
  onPackItemsChange: (id: number, value: string) => void;
  onSaveMemo: (id: number) => void;
  onDurationChange: (id: number, delta: number) => void;
  onCyclePriority: (id: number) => void;
}

export interface PlaceCardProps {
  place: Place;
  order: number;
  isLast: boolean;
  isDragging: boolean;
  expanded: boolean;
  memoSaved: boolean;
  canEdit: boolean;
  directionsUrl: string | null;
  handlers: PlaceCardHandlers;
}

/** 방문지 카드 한 장. 드래그로 순서를 바꾸고, 펼치면 메모/체류시간/카테고리를 편집한다. */
export function PlaceCard({
  place,
  order,
  isLast,
  isDragging,
  expanded,
  memoSaved,
  canEdit,
  directionsUrl,
  handlers,
}: PlaceCardProps) {
  const pr = PRIORITY_MAP[place.priority];

  return (
    <div
      draggable={canEdit}
      onDragStart={() => handlers.onDragStart(order - 1)}
      onDragOver={handlers.onDragOver}
      onDrop={() => handlers.onDrop(order - 1)}
      onDragEnd={handlers.onDragEnd}
      className={isDragging ? `${styles.placeCard} ${styles.placeCardDragging}` : styles.placeCard}
      style={{ cursor: canEdit ? 'grab' : 'default' }}
    >
      <div className={styles.placeOrderCol}>
        <span className={styles.placeOrderBadge}>{order}</span>
        <span className={styles.placeOrderLine} style={{ opacity: isLast ? 0 : 1 }} />
      </div>

      <div className={styles.placeMain}>
        <div className={styles.placeNameRow}>
          <span className={styles.placeName}>{place.name}</span>
          {place.packItems ? (
            <span className={styles.memoDot} title="메모 있음" aria-hidden>
              📝
            </span>
          ) : null}
          <button
            type="button"
            className={styles.priorityChip}
            style={{ background: pr.bg, color: pr.color }}
            onClick={() => handlers.onCyclePriority(place.id)}
          >
            {pr.label}
          </button>
        </div>
        <div className={styles.placeAddress}>{place.address}</div>

        {expanded ? (
          <div className={styles.placeExpanded}>
            <div className={styles.expandedRow}>
              {directionsUrl ? (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener"
                  className={styles.kakaoDirectionsBtn}
                >
                  카카오맵에서 길찾기
                </a>
              ) : (
                <span className={`${styles.kakaoDirectionsBtn} ${styles.kakaoDirectionsDisabled}`}>
                  카카오맵에서 길찾기
                </span>
              )}
              <button
                type="button"
                className={styles.categoryBtn}
                onClick={() => handlers.onOpenCategory(place.id)}
              >
                {place.category}
              </button>
            </div>
            <div className={styles.memoRow}>
              <input
                value={place.packItems}
                onChange={(e) => handlers.onPackItemsChange(place.id, e.target.value)}
                placeholder="메모 (예: 우산, 신분증)"
                className={styles.memoInput}
              />
              <button
                type="button"
                className={styles.memoSaveBtn}
                onClick={() => handlers.onSaveMemo(place.id)}
              >
                {memoSaved ? '저장됨 ✓' : '저장'}
              </button>
            </div>
            <div className={styles.durationRow}>
              <button
                type="button"
                className={styles.durationBtn}
                onClick={() => handlers.onDurationChange(place.id, -5)}
              >
                −
              </button>
              <span className={styles.durationLabel}>체류 {place.duration}분</span>
              <button
                type="button"
                className={styles.durationBtn}
                onClick={() => handlers.onDurationChange(place.id, 5)}
              >
                +
              </button>
              {canEdit ? (
                <button
                  type="button"
                  className={styles.editIconBtn}
                  onClick={() => handlers.onOpenEdit(place.id)}
                  aria-label="방문지 수정"
                >
                  ✎
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={styles.placeDeleteBtn}
        onClick={() => handlers.onDeleteClick(place.id)}
        aria-label="방문지 삭제"
      >
        🗑
      </button>
      <button
        type="button"
        className={styles.placeExpandBtn}
        onClick={() => handlers.onToggleExpand(place.id)}
        aria-label={expanded ? '접기' : '펼치기'}
        style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
      >
        ⌄
      </button>
    </div>
  );
}
