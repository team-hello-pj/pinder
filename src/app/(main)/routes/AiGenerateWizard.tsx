'use client';

import { useState } from 'react';

import { MODE_MAP } from '@/constants';
import { searchKeyword } from '@/lib/kakao/client';
import { requestAiRouteGeneration } from '@/lib/route-generate';
import type { Place, TransportMode } from '@/types';

import styles from './my-routes.module.css';

const REGIONS = [
  '서울',
  '경기',
  '인천',
  '강원',
  '대전',
  '충남',
  '충북',
  '광주',
  '전남',
  '전북',
  '대구',
  '경남',
  '경북',
  '부산',
  '울산',
  '세종',
  '제주',
  '기타',
];

const STYLES = ['여유롭게', '알차게', '인기 장소 위주', '조용하게'];
const INTERESTS = ['맛집', '카페', '관광', '쇼핑', '자연', '문화', '체험'];
const COMPANIONS = ['혼자', '연인', '친구', '가족'];
const TRANSPORTS: { id: TransportMode; label: string }[] = [
  { id: 'walk', label: '도보' },
  { id: 'transit', label: '대중교통' },
  { id: 'car', label: '자동차' },
  { id: 'bike', label: '자전거' },
];

const STEP_COUNT = 5; // 지역/스타일/관심사/동행/이동수단 (날짜는 이전 화면에서 이미 받음)

interface ResultPlace extends Place {
  legDistanceKm?: number | null;
  legMinutes?: number | null;
}

function haversineKm(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const R = 6371;
  const dLat = ((b.y - a.y) * Math.PI) / 180;
  const dLng = ((b.x - a.x) * Math.PI) / 180;
  const lat1 = (a.y * Math.PI) / 180;
  const lat2 = (b.y * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export interface AiGenerateWizardProps {
  open: boolean;
  tripStart: string;
  tripEnd: string;
  onClose: () => void;
  onConfirm: (places: Place[], segments: TransportMode[]) => void;
}

export function AiGenerateWizard({
  open,
  tripStart,
  tripEnd,
  onClose,
  onConfirm,
}: AiGenerateWizardProps) {
  const [step, setStep] = useState(0);
  const [region, setRegion] = useState<string | null>(null);
  const [customRegion, setCustomRegion] = useState('');
  const [regionError, setRegionError] = useState<string | null>(null);
  const [validatingRegion, setValidatingRegion] = useState(false);
  const [style, setStyle] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [companion, setCompanion] = useState<string | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode | null>(null);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPlaces, setResultPlaces] = useState<ResultPlace[] | null>(null);
  const [resultSegments, setResultSegments] = useState<TransportMode[]>([]);

  if (!open) return null;

  const resetForClose = () => {
    setStep(0);
    setRegion(null);
    setCustomRegion('');
    setRegionError(null);
    setValidatingRegion(false);
    setStyle(null);
    setInterests([]);
    setCompanion(null);
    setTransportMode(null);
    setGenerating(false);
    setError(null);
    setResultPlaces(null);
    setResultSegments([]);
    onClose();
  };

  const toggleInterest = (v: string) => {
    setInterests((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const effectiveRegion = region === '기타' ? customRegion.trim() : region;

  const generate = async () => {
    if (!effectiveRegion || !style || !companion || !transportMode) return;
    setGenerating(true);
    setError(null);
    try {
      const { places: aiPlaces } = await requestAiRouteGeneration({
        region: effectiveRegion,
        style,
        interests,
        companion,
        tripStart,
        tripEnd,
      });

      const resolved: ResultPlace[] = [];
      for (const p of aiPlaces) {
        const query = p.addressHint
          ? `${effectiveRegion} ${p.addressHint} ${p.name}`
          : `${effectiveRegion} ${p.name}`;
        let x: number | null = null;
        let y: number | null = null;
        try {
          const data = await searchKeyword(query);
          const doc = data.documents?.[0];
          if (doc) {
            x = Number(doc.x);
            y = Number(doc.y);
          }
        } catch {
          // 지오코딩 실패는 무시하고 좌표 없이 진행한다 (기존 방문지 추가 흐름과 동일한 정책).
        }
        resolved.push({
          id: resolved.length + 1,
          name: p.name,
          category: p.category || '미분류',
          address: p.addressHint || p.name,
          duration: p.duration,
          hours: 'unknown',
          hoursLabel: '영업시간 확인 필요',
          visitTime: '',
          packItems: '',
          weather: 'sunny',
          day: Math.max(0, (p.day || 1) - 1),
          x,
          y,
        });
      }

      // 날짜별로 묶이도록 정렬한다 (같은 날짜 안에서의 순서는 AI가 준 순서를 그대로 유지).
      resolved.sort((a, b) => (a.day ?? 0) - (b.day ?? 0));

      for (let i = 0; i < resolved.length - 1; i++) {
        const a = resolved[i];
        const b = resolved[i + 1];
        if (a.day === b.day && a.x != null && a.y != null && b.x != null && b.y != null) {
          const distanceKm = haversineKm({ x: a.x, y: a.y }, { x: b.x, y: b.y });
          a.legDistanceKm = distanceKm;
          a.legMinutes = Math.round(distanceKm * MODE_MAP[transportMode].minPerKm);
        } else {
          a.legDistanceKm = null;
          a.legMinutes = null;
        }
      }

      setResultPlaces(resolved);
      setResultSegments(new Array(Math.max(0, resolved.length - 1)).fill(transportMode));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 일정을 생성하지 못했어요.');
    } finally {
      setGenerating(false);
    }
  };

  const confirmCustomRegion = async () => {
    const q = customRegion.trim();
    if (!q) return;
    setValidatingRegion(true);
    setRegionError(null);
    try {
      const data = await searchKeyword(q);
      if (!data.documents?.length) {
        setRegionError('존재하지 않는 지역이에요. 다시 입력해주세요.');
        return;
      }
      setStep((s) => s + 1);
    } catch {
      setRegionError('지역을 확인하지 못했어요. 다시 시도해주세요.');
    } finally {
      setValidatingRegion(false);
    }
  };

  const goNext = () => {
    if (step === 0 && region === '기타') {
      void confirmCustomRegion();
      return;
    }
    if (step < STEP_COUNT - 1) {
      setStep((s) => s + 1);
      return;
    }
    void generate();
  };

  const goBack = () => {
    if (step === 0) {
      resetForClose();
      return;
    }
    setStep((s) => s - 1);
  };

  const nextDisabled =
    (step === 0 && (!region || (region === '기타' && !customRegion.trim()) || validatingRegion)) ||
    (step === 1 && !style) ||
    (step === 2 && interests.length === 0) ||
    (step === 3 && !companion) ||
    (step === 4 && !transportMode);

  const totalMinutes = resultPlaces
    ? resultPlaces.reduce((sum, p) => sum + (p.legMinutes ?? 0), 0)
    : 0;
  const totalDistanceKm = resultPlaces
    ? resultPlaces.reduce((sum, p) => sum + (p.legDistanceKm ?? 0), 0)
    : 0;

  const dayGroups: { day: number; items: ResultPlace[] }[] = [];
  if (resultPlaces) {
    for (const p of resultPlaces) {
      const day = p.day ?? 0;
      const last = dayGroups[dayGroups.length - 1];
      if (last && last.day === day) last.items.push(p);
      else dayGroups.push({ day, items: [p] });
    }
  }

  return (
    <div className={styles.aiWizardOverlay}>
      <div className={styles.aiWizardHead}>
        <span className={styles.aiWizardLogo}>p:nder</span>
        <button type="button" className={styles.aiWizardExit} onClick={resetForClose}>
          나가기
        </button>
      </div>

      {!resultPlaces ? (
        <div className={styles.aiWizardDots}>
          {Array.from({ length: STEP_COUNT + 1 }, (_, i) => (
            <span
              key={i}
              className={
                i < step + 1
                  ? `${styles.aiWizardDot} ${styles.aiWizardDotDone}`
                  : i === step + 1
                    ? `${styles.aiWizardDot} ${styles.aiWizardDotActive}`
                    : styles.aiWizardDot
              }
            />
          ))}
        </div>
      ) : null}

      <div className={styles.aiWizardBody}>
        {generating ? (
          <div className={styles.aiWizardLoading}>
            <div className={styles.spinnerLg} />
            <p>AI가 일정을 만들고 있어요...</p>
          </div>
        ) : resultPlaces ? (
          <div className={styles.aiResultWrap}>
            <h2 className={styles.aiWizardTitle}>AI 추천 일정이 완성됐어요</h2>
            <p className={styles.aiWizardSubtitle}>
              {companion} · {style} 여행 {dayGroups.length > 1 ? `· ${dayGroups.length}일` : ''}
            </p>
            {error ? <p className={styles.warnBox}>{error}</p> : null}
            <div className={styles.aiResultStats}>
              <div>
                <p className={styles.aiResultStatLabel}>방문 장소</p>
                <p className={styles.aiResultStatValue}>{resultPlaces.length}곳</p>
              </div>
              <div>
                <p className={styles.aiResultStatLabel}>총 이동시간</p>
                <p className={styles.aiResultStatValue}>{totalMinutes}분</p>
              </div>
              <div>
                <p className={styles.aiResultStatLabel}>총 이동거리</p>
                <p className={styles.aiResultStatValue}>{totalDistanceKm.toFixed(1)}km</p>
              </div>
            </div>
            <div className={styles.aiResultList}>
              {dayGroups.map((g) => (
                <div key={g.day}>
                  {dayGroups.length > 1 ? (
                    <p className={styles.aiResultDayLabel}>{g.day + 1}일차</p>
                  ) : null}
                  {g.items.map((p, i) => (
                    <div key={p.id}>
                      <div className={styles.aiResultItem}>
                        <span className={styles.aiResultIndex}>{i + 1}</span>
                        <div>
                          <p className={styles.aiResultName}>{p.name}</p>
                          <p className={styles.aiResultMeta}>
                            {p.category} · 체류 {p.duration}분
                          </p>
                        </div>
                      </div>
                      {i < g.items.length - 1 ? (
                        <div className={styles.aiResultLeg}>
                          {transportMode ? MODE_MAP[transportMode].label : ''} ·{' '}
                          {p.legMinutes != null ? `${p.legMinutes}분` : '거리 정보 없음'}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {step === 0 ? (
              <>
                <h2 className={styles.aiWizardTitle}>어느 지역으로 떠나시나요?</h2>
                <p className={styles.aiWizardSubtitle}>하나를 선택해주세요</p>
                <div className={styles.aiWizardGrid}>
                  {REGIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={
                        region === r
                          ? `${styles.aiWizardOption} ${styles.aiWizardOptionActive}`
                          : styles.aiWizardOption
                      }
                      onClick={() => {
                        setRegion(r);
                        setRegionError(null);
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {region === '기타' ? (
                  <div className={styles.aiWizardCustomRegion}>
                    <input
                      type="text"
                      className={styles.aiWizardTextInput}
                      value={customRegion}
                      onChange={(e) => {
                        setCustomRegion(e.target.value);
                        setRegionError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void confirmCustomRegion();
                        }
                      }}
                      placeholder="가고 싶은 지역을 입력해주세요 (예: 안동, 여수)"
                      maxLength={30}
                    />
                    {regionError ? <p className={styles.warnBox}>{regionError}</p> : null}
                  </div>
                ) : null}
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h2 className={styles.aiWizardTitle}>어떤 스타일의 여행을 원하세요?</h2>
                <p className={styles.aiWizardSubtitle}>하나를 선택해주세요</p>
                <div className={styles.aiWizardGrid2}>
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={
                        style === s
                          ? `${styles.aiWizardOptionLg} ${styles.aiWizardOptionActive}`
                          : styles.aiWizardOptionLg
                      }
                      onClick={() => setStyle(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h2 className={styles.aiWizardTitle}>관심 있는 장소를 골라주세요</h2>
                <p className={styles.aiWizardSubtitle}>여러 개 선택할 수 있어요</p>
                <div className={styles.aiWizardGrid}>
                  {INTERESTS.map((it) => (
                    <button
                      key={it}
                      type="button"
                      className={
                        interests.includes(it)
                          ? `${styles.aiWizardOption} ${styles.aiWizardOptionActive}`
                          : styles.aiWizardOption
                      }
                      onClick={() => toggleInterest(it)}
                    >
                      {it}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h2 className={styles.aiWizardTitle}>누구와 함께 하나요?</h2>
                <p className={styles.aiWizardSubtitle}>하나를 선택해주세요</p>
                <div className={styles.aiWizardGrid2}>
                  {COMPANIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={
                        companion === c
                          ? `${styles.aiWizardOptionLg} ${styles.aiWizardOptionActive}`
                          : styles.aiWizardOptionLg
                      }
                      onClick={() => setCompanion(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <h2 className={styles.aiWizardTitle}>이동 방식을 선택해주세요</h2>
                <p className={styles.aiWizardSubtitle}>하나를 선택해주세요</p>
                <div className={styles.aiWizardGrid2}>
                  {TRANSPORTS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={
                        transportMode === t.id
                          ? `${styles.aiWizardOptionLg} ${styles.aiWizardOptionActive}`
                          : styles.aiWizardOptionLg
                      }
                      onClick={() => setTransportMode(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>

      {!generating ? (
        <div className={styles.aiWizardFooter}>
          {resultPlaces ? (
            <>
              <button type="button" className={styles.aiWizardSecondaryBtn} onClick={generate}>
                다시 추천받기
              </button>
              <button
                type="button"
                className={styles.aiWizardPrimaryBtn}
                onClick={() => onConfirm(resultPlaces, resultSegments)}
              >
                이 일정으로 시작하기
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.aiWizardBackBtn} onClick={goBack}>
                뒤로
              </button>
              <button
                type="button"
                className={styles.aiWizardPrimaryBtn}
                disabled={nextDisabled}
                onClick={goNext}
              >
                {validatingRegion
                  ? '확인 중...'
                  : step === STEP_COUNT - 1
                    ? 'AI 일정 생성하기'
                    : '다음'}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
