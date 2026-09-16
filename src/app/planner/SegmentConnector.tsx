'use client';

import { MODE_MAP } from '@/constants';
import { formatDuration } from '@/lib/format';
import type { TransportMode } from '@/types';

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
  onCycle: () => void;
  onToggleExpand: () => void;
}

const MODE_ICON: Record<TransportMode, string> = {
  car: '🚗',
  walk: '🚶',
  transit: '🚌',
  bike: '🚲',
};

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
            <span aria-hidden>{MODE_ICON[mode]}</span>
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
