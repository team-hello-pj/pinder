'use client';

import { useRef } from 'react';

import { NewTripFlow, type NewTripFlowHandle } from './routes/NewTripFlow';
import styles from './AntCtaCard.module.css';

/**
 * 홈 히어로의 CTA 카드. 개미 한 마리가 카드를 가로질러 기어가고,
 * 지나간 자리에 발자국(trail)이 옅게 남았다 사라지는 브랜드 애니메이션.
 * legacy/main(home).dc.html 의 ants/trails 계산 로직을 그대로 옮겼다.
 */

// 개미가 지나가는 경로의 주요 지점(퍼센트 좌표) — pd-ant-move 키프레임과 같은 경로.
const PATH_KEYS = [
  { t: 0.04, x: 8, y: 86 },
  { t: 0.15, x: 15, y: 66 },
  { t: 0.28, x: 26, y: 55 },
  { t: 0.4, x: 38, y: 52 },
  { t: 0.55, x: 55, y: 53 },
  { t: 0.68, x: 70, y: 52 },
  { t: 0.78, x: 80, y: 44 },
  { t: 0.84, x: 84, y: 30 },
  { t: 0.9, x: 86, y: 26 },
  { t: 0.94, x: 86.5, y: 25.5 },
  { t: 1.0, x: 87, y: 25 },
];

function pointAt(t: number): { x: number; y: number } {
  for (let i = 0; i < PATH_KEYS.length - 1; i++) {
    const a = PATH_KEYS[i];
    const b = PATH_KEYS[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t;
      const u = span > 0 ? (t - a.t) / span : 0;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    }
  }
  return t < PATH_KEYS[0].t ? PATH_KEYS[0] : PATH_KEYS[PATH_KEYS.length - 1];
}

// 개미와 같은 경로를, 같은 속도(고정 시간 간격)로 샘플링해 발자국을 만든다.
// 거리 기준이 아니라 시간 기준이라 각 발자국이 실제 개미가 지나간 시점 그대로 나타난다.
const ANT_DURATION_SEC = 32;
const TRAIL_START_T = 0.06;
const TRAIL_END_T = 0.9;
const TRAIL_STEP_T = 0.06;

const TRAILS = (() => {
  const points: { x: string; y: string; delay: string }[] = [];
  for (let t = TRAIL_START_T; t <= TRAIL_END_T + 1e-6; t += TRAIL_STEP_T) {
    const p = pointAt(t);
    points.push({
      x: `${p.x}%`,
      y: `${p.y}%`,
      delay: `${t * ANT_DURATION_SEC + 0.6}s`,
    });
  }
  return points;
})();

export function AntCtaCard() {
  const newTripFlowRef = useRef<NewTripFlowHandle>(null);

  return (
    <div className={styles.card}>
      <div className={styles.blob} aria-hidden />
      <div className={styles.cornerPin} aria-hidden>
        <div className={styles.cornerPinDot} />
      </div>

      {TRAILS.map((tr, i) => (
        <div
          key={i}
          className={styles.trail}
          style={{ left: tr.x, top: tr.y, animationDelay: tr.delay }}
        />
      ))}

      <div className={styles.ant} aria-hidden>
        <div className={styles.antCrawl}>
          <div className={styles.antMark} />
        </div>
      </div>

      <div className={styles.title}>지금 바로 시작하세요</div>
      <div className={styles.sub}>무료로 나만의 여행 일정을 만들어보세요</div>
      <button
        type="button"
        className={styles.button}
        onClick={() => newTripFlowRef.current?.open()}
      >
        최적 동선 생성하기 →
      </button>

      <NewTripFlow ref={newTripFlowRef} />
    </div>
  );
}
