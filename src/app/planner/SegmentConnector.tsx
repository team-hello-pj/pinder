'use client';

import { MODE_MAP } from '@/constants';
import { formatDuration } from '@/lib/format';
import type { TransportMode } from '@/types';

import { ModeIcon } from './ModeIcon';
import styles from './planner.module.css';

export interface SegmentStep {
  mode: TransportMode;
  arrowLabel: string;
  minutes: number;
  distanceKm: number;
  nodeLabel: string | null;
}

export interface SegmentConnectorProps {
  mode: TransportMode;
  totalMinutes: number;
  totalDistanceKm: number;
  transfers: number | null;
  /** null 이면 아직 실제 경로를 조회하지 않은 상태, 'failed' 면 조회 실패 */
  status: 'ok' | 'unsearched' | 'failed';
  steps: SegmentStep[];
  expanded: boolean;
  canEdit: boolean;
  /** 카카오맵 길찾기 바로가기 URL. 좌표가 없으면 null (버튼 비활성) */
  directionsUrl: string | null;
  onCycle: () => void;
  onToggleExpand: () => void;
}

/** 두 방문지 사이 이동 구간. 클릭하면 이동수단이 순환하고, 대중교통이면 세부 단계를 펼쳐 보여준다. */
export function SegmentConnector({
  mode,
  totalMinutes,
  totalDistanceKm,
  transfers,
  status,
  steps,
  expanded,
  canEdit,
  directionsUrl,
  onCycle,
  onToggleExpand,
}: SegmentConnectorProps) {
  const info = MODE_MAP[mode];
  const durationLabel =
    status === 'failed'
      ? '경로 정보를 불러오지 못했어요'
      : status === 'unsearched'
        ? '경로 검색 버튼을 눌러 실제 경로를 조회해주세요'
        : formatDuration(totalMinutes);
  const distanceLabel =
    status === 'ok'
      ? `${totalDistanceKm.toFixed(1)}km${mode === 'transit' && transfers != null ? ` · 환승 ${transfers}회` : ''}`
      : '';

  return (
    <div className={styles.segmentRow}>
      <div className={styles.segmentLine} aria-hidden />
      <div className={styles.segmentBody}>
        <div className={styles.segmentHead}>
          <button
            type="button"
            className={`${styles.segmentChip} ${styles[`segmentChip-${mode}`]}`}
            onClick={onCycle}
            disabled={!canEdit}
          >
            <ModeIcon mode={mode} />
            <span className={styles.segmentLabel}>{info.label}</span>
            <span className={styles.segmentMeta}>
              · {durationLabel}
              {distanceLabel ? ` · ${distanceLabel}` : ''}
            </span>
          </button>
          {steps.length > 1 ? (
            <button
              type="button"
              className={`${styles.segmentToggle} ${styles[`segmentChip-${mode}`]}`}
              onClick={onToggleExpand}
              aria-label={expanded ? '세부 경로 접기' : '세부 경로 펼치기'}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: expanded ? 'rotate(180deg)' : 'none',
                  transition: 'transform .15s',
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          ) : null}
          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener"
              className={styles.segmentKakaoBtn}
              aria-label="카카오맵에서 길찾기"
              title="카카오맵에서 길찾기"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#191919">
                <path d="M12 2C7 2 3 5.3 3 9.4c0 2.7 1.8 5 4.4 6.4-.2.7-.7 2.5-.8 2.9 0 0-.1.4.2.5.2.1.5 0 .6-.1.4-.2 2.9-2 3.6-2.4.6.1 1.3.2 2 .2 5 0 9-3.3 9-7.4S17 2 12 2Z" />
              </svg>
            </a>
          ) : (
            <span
              className={`${styles.segmentKakaoBtn} ${styles.segmentKakaoBtnDisabled}`}
              aria-hidden
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#191919">
                <path d="M12 2C7 2 3 5.3 3 9.4c0 2.7 1.8 5 4.4 6.4-.2.7-.7 2.5-.8 2.9 0 0-.1.4.2.5.2.1.5 0 .6-.1.4-.2 2.9-2 3.6-2.4.6.1 1.3.2 2 .2 5 0 9-3.3 9-7.4S17 2 12 2Z" />
              </svg>
            </span>
          )}
        </div>

        {expanded && steps.length > 1 ? (
          <div className={styles.segmentDetail}>
            {steps.map((st, i) => (
              <div key={i} className={styles.segmentStep}>
                <div className={styles.segmentStepDot} aria-hidden />
                <div className={styles.segmentStepBody}>
                  <span
                    className={`${styles.segmentStepLabel} ${styles[`segmentChip-${st.mode}`]}`}
                  >
                    {st.arrowLabel}
                  </span>{' '}
                  {formatDuration(st.minutes)} · {st.distanceKm.toFixed(1)}km
                  {st.nodeLabel ? (
                    <div className={styles.segmentStepNode}>{st.nodeLabel}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
