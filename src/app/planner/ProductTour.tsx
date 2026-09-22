'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui';

import styles from './product-tour.module.css';

/**
 * /planner 최초 방문자에게 실제 화면 요소를 순서대로 소개하는 Product Tour.
 * 기존 PlannerClient 코드와는 최소한의 접점(data-tour="..." 셀렉터)만 갖도록 분리했다.
 *
 * "완료"와 "다시 보지 않기"는 분리되어 있다 — 끝까지 보거나 건너뛰어도 사용자가
 * "다시 보지 않기"를 직접 체크하지 않았다면 다음 방문에서 다시 노출된다.
 * 예전에는 완료/건너뛰기만 해도 `pinder-planner-tour-completed` 에 true 를 저장해 영구히
 * 숨겼다 — 그 키는 더 이상 표시 여부 판단에 쓰지 않는다(과거에 그 키가 true 로 저장된
 * 사용자도 새 DISMISSED_STORAGE_KEY 가 없으면 다시 노출된다).
 *
 * 개발 중 다시 보고 싶으면 브라우저 콘솔에서 아래를 실행하고 새로고침:
 *   localStorage.removeItem('pinder-planner-tour-dismissed')
 */
const DISMISSED_STORAGE_KEY = 'pinder-planner-tour-dismissed';

interface TourStep {
  selector: string;
  title: string;
  desc: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="place-search"]',
    title: '먼저 가고 싶은 장소를 검색해보세요.',
    desc: '가고 싶은 장소를 검색하면 방문지로 추가할 수 있어요.',
  },
  {
    selector: '[data-tour="place-list"]',
    title: '검색한 장소를 방문지로 추가해보세요.',
    desc: '추가한 장소는 이곳에서 한눈에 확인할 수 있어요.',
  },
  {
    selector: '[data-tour="place-order"]',
    title: '방문 순서는 드래그해서 바꿀 수 있어요.',
    desc: '원하는 순서대로 방문지를 자유롭게 정리해보세요.',
  },
  {
    selector: '[data-tour="schedule"]',
    title: '일정만 설정 가능',
    desc: '여행 날짜를 정하면 경로 계산에 활용돼요.',
  },
  {
    selector: '[data-tour="variables"]',
    title: '일정에 영향을 줄 조건도 추가할 수 있어요.',
    desc: '날씨나 짐처럼 이동에 영향을 줄 변수를 설정해보세요.',
  },
  {
    selector: '[data-tour="map-toggle"]',
    title: '이 아이콘을 누르면 지도를 크게 볼 수 있어요.',
    desc: '지도 화면으로 전환해서 전체 경로를 확인할 수 있어요.',
  },
  {
    selector: '[data-tour="my-location"]',
    title: '현재 위치를 확인 할 수 있어요',
    desc: '내 위치 버튼을 누르면 현재 위치를 목적지로 바로 추가할 수 있어요.',
  },
  {
    selector: '[data-tour="ai-helper"]',
    title: '일정이나 경로가 어렵다면 AI 도우미에게 물어보세요.',
    desc: '여행 일정과 경로에 대해 도움을 받을 수 있어요.',
  },
  {
    selector: '[data-tour="calculate-route"]',
    title: '이제 최적 경로를 계산해보세요!',
    desc: '설정한 일정과 조건을 바탕으로 이동 경로를 계산할 수 있어요.',
  },
];

const SPOTLIGHT_PADDING = 8;
const BUBBLE_GAP = 12;
const VIEWPORT_MARGIN = 12;
const MAX_WAIT_TRIES = 30; // 200ms * 30 = 최대 6초, 지도/버튼 등 비동기 렌더를 기다린다.

type Phase = 'checking' | 'active' | 'idle' | 'done';

/**
 * Next.js의 Suspense 스트리밍은 완료 후에도 `<div id="S:0" hidden>` 같은 비활성 스캐폴드를
 * DOM에 남겨둔다 — 그 안에는 실제 화면과 똑같은 마크업(예: 열려 있는 <dialog>)이 얼어붙은
 * 채로 남아있어, 단순 document.querySelector 는 종종 이 보이지 않는 사본을 집어버린다.
 * hidden 조상을 가진 요소는 전부 걸러내고 실제로 화면에 있는 요소만 타깃으로 삼는다.
 */
function isReallyRendered(el: Element): boolean {
  return el.closest('[hidden]') === null;
}

function findVisibleTarget(selector: string): HTMLElement | null {
  const matches = document.querySelectorAll<HTMLElement>(selector);
  for (const el of matches) {
    if (isReallyRendered(el)) return el;
  }
  return null;
}

function hasBlockingDialog(): boolean {
  const dialogs = document.querySelectorAll<HTMLElement>('dialog[open]');
  for (const d of dialogs) {
    if (isReallyRendered(d)) return true;
  }
  return false;
}

function readInitialPhase(): Phase {
  if (typeof window === 'undefined') return 'checking';
  try {
    return window.localStorage.getItem(DISMISSED_STORAGE_KEY) === 'true' ? 'done' : 'checking';
  } catch {
    return 'checking';
  }
}

export function ProductTour() {
  const [phase, setPhase] = useState<Phase>(readInitialPhase);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [bubbleSize, setBubbleSize] = useState({ width: 0, height: 0 });
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    if (dontShowAgain) {
      try {
        window.localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
      } catch {
        // localStorage를 쓸 수 없는 환경(프라이빗 모드 등) — 이번 렌더만 종료 처리하고 넘어간다.
      }
    }
    setPhase('done');
  }, [dontShowAgain]);

  // 아직 완료/건너뛰기 이력이 없으면(phase==='checking'), 첫 타깃이 실제로 렌더될 때까지 대기한다.
  useEffect(() => {
    if (phase !== 'checking') return;

    let cancelled = false;
    let tries = 0;
    let timeoutId: number;

    const tick = () => {
      if (cancelled) return;
      tries += 1;
      // 새 일정 만들기 등 다른 모달이 이미 떠 있으면 그 위에 겹쳐 보이므로 비켜준다.
      const blockingDialogOpen = hasBlockingDialog();
      const anyTargetReady =
        !blockingDialogOpen && TOUR_STEPS.some((s) => findVisibleTarget(s.selector));
      if (anyTargetReady) {
        setPhase('active');
        return;
      }
      if (tries >= MAX_WAIT_TRIES) {
        // 끝까지 타깃을 하나도 못 찾으면 이번엔 띄우지 않는다(완료 처리는 하지 않아 다음 방문 때 재시도).
        setPhase('idle');
        return;
      }
      timeoutId = window.setTimeout(tick, 200);
    };
    timeoutId = window.setTimeout(tick, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [phase]);

  // 현재 스텝의 실제 DOM 타깃을 찾는다. 없으면(조건부 렌더로 아직 없거나 화면에 없는 경우)
  // 에러 없이 다음 스텝으로 넘어가고, 마지막 스텝까지 없으면 종료한다.
  useEffect(() => {
    if (phase !== 'active') return;
    const step = TOUR_STEPS[stepIndex];
    if (!step) {
      const id = window.setTimeout(finish, 0);
      return () => window.clearTimeout(id);
    }
    const el = findVisibleTarget(step.selector);
    if (!el) {
      const id = window.setTimeout(() => {
        if (stepIndex >= TOUR_STEPS.length - 1) finish();
        else setStepIndex((i) => i + 1);
      }, 0);
      return () => window.clearTimeout(id);
    }

    const update = () => setRect(el.getBoundingClientRect());
    // requestAnimationFrame은 배경 탭/자동화 환경에서 지연되거나 아예 안 불릴 수 있어
    // setTimeout으로 다음 매크로태스크에 미룬다(둘 다 "effect 본문에서 곧바로 setState 호출"은 피한다).
    const timeoutId = window.setTimeout(update, 0);

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    // 캡처 단계로 등록하면 좌측 패널/방문지 목록처럼 내부 스크롤되는 요소의 스크롤도 감지된다.
    window.addEventListener('scroll', update, true);

    return () => {
      window.clearTimeout(timeoutId);
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [phase, stepIndex, finish]);

  // 말풍선 실제 렌더 크기를 측정해 위치 계산에 반영한다.
  useEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    const update = () => setBubbleSize({ width: el.offsetWidth, height: el.offsetHeight });
    const timeoutId = window.setTimeout(update, 0);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      window.clearTimeout(timeoutId);
      ro.disconnect();
    };
  }, [phase, stepIndex, rect]);

  const bubblePos = useMemo(() => {
    if (!rect || typeof window === 'undefined') return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = bubbleSize.width || 300;
    const height = bubbleSize.height || 150;

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const placeBelow = spaceBelow >= height + BUBBLE_GAP || spaceBelow >= spaceAbove;

    let top = placeBelow ? rect.bottom + BUBBLE_GAP : rect.top - height - BUBBLE_GAP;
    top = Math.min(
      Math.max(top, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, vh - height - VIEWPORT_MARGIN),
    );

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.min(
      Math.max(left, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN),
    );

    return { top, left };
  }, [rect, bubbleSize]);

  if (phase !== 'active' || !rect) return null;

  const step = TOUR_STEPS[stepIndex];
  if (!step) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const pos = bubblePos ?? { top: rect.top, left: rect.left };

  const spotlightStyle = {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };

  return (
    <>
      <div className={styles.blocker} />
      <div className={styles.spotlight} style={spotlightStyle} />
      <div
        ref={bubbleRef}
        className={styles.bubble}
        style={{ top: pos.top, left: pos.left }}
        role="dialog"
        aria-modal="true"
        aria-label="사용법 안내"
      >
        <div className={styles.bubbleHead}>
          <span className={styles.bubbleStep}>
            {stepIndex + 1} / {TOUR_STEPS.length}
          </span>
          <button type="button" className={styles.skipBtn} onClick={finish}>
            건너뛰기
          </button>
        </div>
        <p className={styles.bubbleTitle}>{step.title}</p>
        <p className={styles.bubbleDesc}>{step.desc}</p>
        <label className={styles.dontShowRow}>
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          <span>다시 보지 않기</span>
        </label>
        <div className={styles.bubbleFooter}>
          {isFirst ? (
            <span />
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            >
              이전
            </Button>
          )}
          <Button size="sm" onClick={isLast ? finish : () => setStepIndex((i) => i + 1)}>
            {isLast ? '완료' : '다음'}
          </Button>
        </div>
      </div>
    </>
  );
}
