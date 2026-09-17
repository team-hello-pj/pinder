'use client';

import { useRouter } from 'next/navigation';
import { forwardRef, useImperativeHandle, useState } from 'react';

import { saveAiRouteHandoff } from '@/lib/ai-route-handoff';
import { fmtDateLabel } from '@/lib/calendar';
import { useSession } from '@/components/providers/SessionProvider';
import { Button, DateRangeCalendar, Modal } from '@/components/ui';
import type { Place, TransportMode } from '@/types';

import { AiGenerateWizard } from './AiGenerateWizard';
import styles from './my-routes.module.css';

type CreateMode = 'manual' | 'ai';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface NewTripFlowHandle {
  /**
   * 로그인 상태면 "새 일정 만들기" 팝업을, 아니면 로그인 페이지를 띄운다.
   * `route`를 주면(여행지 탐색에서 미리 만들어둔 동선으로 들어온 경우) 생성 방식 선택과
   * AI 마법사를 모두 건너뛰고, 날짜만 고르면 그 동선 그대로 플래너로 넘어간다.
   */
  open: (preset?: { route: { places: Place[]; segments: TransportMode[] } }) => void;
}

/**
 * "새 일정 만들기" 흐름(생성 방식 선택 → 날짜 선택 → AI 마법사)을 캡슐화한 공용 컴포넌트.
 * 내 일정(/routes) 화면과 메인 화면의 "최적 동선 생성하기" 버튼이 이 컴포넌트 하나를 함께 쓴다.
 * 새로운 팝업을 만들지 말고 ref.open() 으로 이 컴포넌트를 재사용할 것.
 */
export const NewTripFlow = forwardRef<NewTripFlowHandle>(function NewTripFlow(_props, ref) {
  const router = useRouter();
  const { isLoggedIn } = useSession();

  const [modeSelectOpen, setModeSelectOpen] = useState(false);
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [aiWizardOpen, setAiWizardOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('manual');
  const [newTripStart, setNewTripStart] = useState(todayStr());
  const [newTripEnd, setNewTripEnd] = useState('');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [presetRoute, setPresetRoute] = useState<{
    places: Place[];
    segments: TransportMode[];
  } | null>(null);

  useImperativeHandle(ref, () => ({
    open: (preset) => {
      if (!isLoggedIn) {
        router.push('/login');
        return;
      }
      setNewTripStart(todayStr());
      setNewTripEnd('');
      setPresetRoute(preset?.route ?? null);
      if (preset?.route) {
        // 여행지 탐색에서 미리 만들어둔 동선으로 들어온 경우 — 생성 방식 선택도, AI 마법사도
        // 건너뛰고 날짜만 고르면 바로 그 동선으로 시작한다.
        setCreateMode('ai');
        setCalYear(new Date().getFullYear());
        setCalMonth(new Date().getMonth());
        setNewTripOpen(true);
        return;
      }
      setModeSelectOpen(true);
    },
  }));

  const chooseMode = (mode: CreateMode) => {
    setCreateMode(mode);
    setModeSelectOpen(false);
    setCalYear(new Date().getFullYear());
    setCalMonth(new Date().getMonth());
    setNewTripOpen(true);
  };
  const resetDates = () => {
    setNewTripStart(todayStr());
    setNewTripEnd('');
  };
  const onCalDayClick = (dateStr: string) => {
    if (!newTripStart || (newTripStart && newTripEnd)) {
      setNewTripStart(dateStr);
      setNewTripEnd('');
      return;
    }
    if (dateStr === newTripStart) {
      setNewTripEnd(dateStr);
      return;
    }
    if (dateStr < newTripStart) {
      setNewTripEnd(newTripStart);
      setNewTripStart(dateStr);
      return;
    }
    setNewTripEnd(dateStr);
  };
  const newTripHref = `/planner?new=1&tripStart=${encodeURIComponent(newTripStart)}&tripEnd=${encodeURIComponent(newTripEnd || newTripStart)}&mode=${createMode}`;

  const startNewTrip = () => {
    if (presetRoute) {
      // 이미 만들어져 있는 동선이므로 AI 마법사 없이 바로 핸드오프한다.
      saveAiRouteHandoff(presetRoute);
      setNewTripOpen(false);
      router.push(newTripHref);
      return;
    }
    if (createMode === 'ai') {
      setNewTripOpen(false);
      setAiWizardOpen(true);
      return;
    }
    router.push(newTripHref);
  };

  const handleAiConfirm = (places: Place[], segments: TransportMode[]) => {
    saveAiRouteHandoff({ places, segments });
    setAiWizardOpen(false);
    router.push(newTripHref);
  };

  return (
    <>
      {/* 생성 방식 선택 */}
      <Modal
        open={modeSelectOpen}
        title="어떻게 일정을 만들까요?"
        onClose={() => setModeSelectOpen(false)}
      >
        <div className={styles.modeList}>
          <button type="button" className={styles.modeOption} onClick={() => chooseMode('manual')}>
            <span className={styles.modeTitle}>직접 생성하기</span>
            <span className={styles.modeDesc}>
              내가 가고 싶은 곳을 입력하고 최적의 동선을 생성해줘요
            </span>
          </button>
          <button type="button" className={styles.modeOption} onClick={() => chooseMode('ai')}>
            <span className={styles.modeTitle}>AI 생성하기</span>
            <span className={styles.modeDesc}>AI로 알아서 최적의 동선을 생성해줘요</span>
          </button>
        </div>
      </Modal>

      {/* 새 일정 날짜 선택 */}
      <Modal open={newTripOpen} title="새 일정 만들기" onClose={() => setNewTripOpen(false)}>
        <div className={styles.newTripHead}>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={resetDates}
            title="날짜 초기화"
          >
            ↺ 초기화
          </button>
        </div>
        <DateRangeCalendar
          variant="full"
          year={calYear}
          month={calMonth}
          start={newTripStart}
          end={newTripEnd}
          onDayClick={onCalDayClick}
          onPrevMonth={() => {
            let m = calMonth - 1;
            let y = calYear;
            if (m < 0) {
              m = 11;
              y -= 1;
            }
            setCalMonth(m);
            setCalYear(y);
          }}
          onNextMonth={() => {
            let m = calMonth + 1;
            let y = calYear;
            if (m > 11) {
              m = 0;
              y += 1;
            }
            setCalMonth(m);
            setCalYear(y);
          }}
        />
        <div className={styles.tripDatesSummary}>
          <div>
            <div className={styles.tripDateLabel}>출발 날짜</div>
            <div className={styles.tripDateValue}>
              {newTripStart ? fmtDateLabel(newTripStart) : '날짜를 선택해주세요'}
            </div>
          </div>
          <div>
            <div className={styles.tripDateLabel}>도착 날짜</div>
            <div className={styles.tripDateValue}>
              {newTripEnd ? fmtDateLabel(newTripEnd) : '날짜를 선택해주세요'}
            </div>
          </div>
        </div>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setNewTripOpen(false)}>
            취소
          </Button>
          <Button size="sm" onClick={startNewTrip}>
            시작하기
          </Button>
        </div>
      </Modal>

      <AiGenerateWizard
        open={aiWizardOpen}
        tripStart={newTripStart}
        tripEnd={newTripEnd || newTripStart}
        onClose={() => setAiWizardOpen(false)}
        onConfirm={handleAiConfirm}
      />
    </>
  );
});
