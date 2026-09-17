'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CATEGORY_OPTIONS,
  CRITERIA_LABEL,
  MODE_MAP,
  MODE_ORDER,
  SEVERITY_LEVELS,
  SITUATION_VARS,
  WEATHER_SUBS,
} from '@/constants';
import { consumeAiRouteHandoff } from '@/lib/ai-route-handoff';
import { runWithConcurrencyLimit } from '@/lib/concurrency';
import { askAssistant, type ChatMessage, type RecommendedPlace } from '@/lib/chat';
import { requestAiRouteAdjustment } from '@/lib/route-adjust';
import {
  fetchRouteLeg,
  KakaoApiError,
  loadKakaoMapsSdk,
  searchKeyword,
  type KakaoPlaceDoc,
} from '@/lib/kakao/client';
import { fmtRange } from '@/lib/calendar';
import { tripDayCount } from '@/lib/format';
import { applySituationAdjustment, computeMockSteps, SEGMENT_DISTANCES } from '@/lib/route-engine';
import {
  buildRouteSignature,
  computeDelayCost,
  haversineKm,
  solveWeightedOpenPathOrder,
  sumPathCost,
  type OptimalRouteResult,
  type RouteOptimizationState,
} from '@/lib/route-optimizer';
import { fetchRouteWeights, type RouteVariableInput } from '@/lib/route-weights';
import {
  createSchedule,
  deleteSchedule,
  getInviteLink,
  getSchedule,
  getScheduleByViewToken,
  joinSchedule,
  requestEditPermission as apiRequestEditPermission,
  resolveEditRequest,
  updateSchedule,
  type ScheduleRole,
} from '@/lib/schedules';
import { useSession } from '@/components/providers/SessionProvider';
import { Button, Modal } from '@/components/ui';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import type { Place, RouteCriteria, RouteLeg, TransportMode } from '@/types';

import type { EditRequest, Member } from './data';
import { ModeIcon } from './ModeIcon';
import { PlaceCard } from './PlaceCard';
import { SegmentConnector, type SegmentStep } from './SegmentConnector';
import styles from './planner.module.css';

type CacheEntry = RouteLeg | { failed: true; errorMsg: string };
type DeleteTarget = number | 'ALL' | 'ORIGINAL_ROUTE' | null;

function resizeSegments(places: Place[], segments: TransportMode[]): TransportMode[] {
  const need = Math.max(0, places.length - 1);
  const next = segments.slice(0, need);
  while (next.length < need) next.push('car');
  return next;
}

/** 새 방문지에 부여할 다음 id — 기존 방문지들의 id보다 항상 커야 중복(같은 id를 가진 두 방문지)이 안 생긴다. */
function nextIdAfter(places: Place[]): number {
  return places.reduce((max, p) => Math.max(max, p.id), 0) + 1;
}

/** 일차마다 지도 경로선 색을 다르게 보여주기 위한 초록 계열 팔레트. 일차 수가 더 많으면 순환한다. */
const DAY_ROUTE_COLORS = [
  '#2C8F4A', // 기본 초록
  '#1B5E3A', // 짙은 숲초록
  '#059669', // 에메랄드
  '#65A30D', // 연두(올리브)
  '#0F766E', // 청록(틸)
  '#4FAF6D', // 밝은 초록
  '#15803D', // 진초록
];

function routeColorForDay(day: number): string {
  return DAY_ROUTE_COLORS[day % DAY_ROUTE_COLORS.length];
}

function buildSuggestionChips(suggestions: string[]): string[] {
  return suggestions.filter(Boolean).slice(0, 3);
}

/** 사용자가 채팅에서 직접 "추가해줘"/"수정해줘" 등으로 동선 반영을 명령했는지 판단한다. */
const ROUTE_COMMAND_PATTERN = /추가|수정|바꿔|교체|변경/;
function isRouteCommandMessage(text: string): boolean {
  return ROUTE_COMMAND_PATTERN.test(text);
}

/** "2일차" 같은 표현에서 몇 일차인지 뽑아낸다 (0-based로 반환, 없으면 null). */
const DAY_NUMBER_PATTERN = /(\d+)\s*일\s*차/;
function extractDayNumber(text: string): number | null {
  const m = text.match(DAY_NUMBER_PATTERN);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 ? n - 1 : null;
}

/** legacy/Route Planner App.dc.html 을 그대로 이식. 헤더/푸터는 (main) 레이아웃이 담당한다. */
export function PlannerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewRoute = searchParams.get('new') === '1';
  const hasTripDateParam = Boolean(searchParams.get('tripStart'));

  // ---- 핵심 데이터 ----
  // 쿼리스트링 없이 그냥 /planner 로 들어와도(북마크, 뒤로가기 등) 항상 빈 목록에서 시작한다 —
  // 데모 방문지(INITIAL_PLACES)는 legacy 프로토타입 전용이었고 실사용자에게 보이면 안 된다.
  const [places, setPlaces] = useState<Place[]>([]);
  // 방문지 id 발급은 상태(state)가 아니라 ref 로 관리한다 — state로 하면 AI 추천 장소 추가처럼
  // 비동기 작업(geocoding) 도중 다른 추가가 끼어들 때 같은 id를 두 번 발급해 지도 핀 번호가
  // 표시되지 않거나 겹치는 문제가 생길 수 있다. ref 는 그 자리에서 바로 증가하므로 안전하다.
  const nextIdRef = useRef(1);
  const allocatePlaceId = useCallback(() => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    return id;
  }, []);
  const [segments, setSegments] = useState<TransportMode[]>([]);
  // 방문지가 추가/삭제/순서변경 되면 구간(이동수단)이 어느 방문지 사이 것인지 알 수 없게 된다 —
  // 기존 구간 배열은 위치 기반이라 순서가 바뀌면 엉뚱한 구간에 매칭되어 밀리거나 겹쳐 보였다.
  // 그래서 방문지 목록이 바뀔 때마다 구간 표시를 숨기고, "경로 계산"을 다시 눌러야
  // 새로 계산된 구간이 나타나게 한다.
  const [routeSegmentsReady, setRouteSegmentsReady] = useState(false);
  const [criteria, setCriteriaState] = useState<RouteCriteria>('time');
  const [routeCache, setRouteCache] = useState<Record<string, CacheEntry>>({});
  const [routeSearching, setRouteSearching] = useState(false);
  const [lastAppliedMode, setLastAppliedMode] = useState<TransportMode | null>(null);

  const [tripStart, setTripStart] = useState(
    isNewRoute ? new Date().toISOString().slice(0, 10) : '',
  );
  const [tripEnd, setTripEnd] = useState(isNewRoute ? new Date().toISOString().slice(0, 10) : '');
  const [newTripDateModalOpen, setNewTripDateModalOpen] = useState(false);
  const [dateEditModalOpen, setDateEditModalOpen] = useState(false);
  const [draftTripStart, setDraftTripStart] = useState('');
  const [draftTripEnd, setDraftTripEnd] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // ---- 레이아웃 ----
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);

  // ---- 방문지 입력/편집 ----
  const [newAddress, setNewAddress] = useState('');
  const [pendingSelectedDoc, setPendingSelectedDoc] = useState<KakaoPlaceDoc | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [expandedPlaces, setExpandedPlaces] = useState<Record<number, boolean>>({});
  const [expandedSegments, setExpandedSegments] = useState<Record<number, boolean>>({});
  const [savedMemoIds, setSavedMemoIds] = useState<Record<number, boolean>>({});

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryTargetId, setCategoryTargetId] = useState<number | null>(null);

  const [addConfirmOpen, setAddConfirmOpen] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [pendingAddress, setPendingAddress] = useState('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<DeleteTarget>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState('');
  const [deleteAgreeChecked, setDeleteAgreeChecked] = useState(false);

  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leaveTargetHref, setLeaveTargetHref] = useState('/');

  // ---- 지도 / 검색 ----
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<KakaoMapInstance | null>(null);
  const kakaoMarkersRef = useRef<KakaoOverlayLike[]>([]);
  const kakaoPolylinesRef = useRef<KakaoOverlayLike[]>([]);
  const searchMarkerRef = useRef<KakaoOverlayLike | null>(null);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [kakaoLoadFailed, setKakaoLoadFailed] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [mapSearchBarCollapsed, setMapSearchBarCollapsed] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<KakaoPlaceDoc[]>([]);
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const [mapSearchError, setMapSearchError] = useState<string | null>(null);

  // ---- 상황 변경 ----
  // 전체보기에서 "변수 추가"를 누르면 어느 일차에 적용할지부터 고르게 한다 — 상황 변경 로직
  // 자체는 일차 구분 없이 전체 places/segments를 대상으로 동작하므로, 먼저 그 일차로
  // 화면을 좁혀 놓은 뒤 기존과 동일한 흐름을 그대로 태운다.
  const [variableDayPickerOpen, setVariableDayPickerOpen] = useState(false);
  const [situationModalOpen, setSituationModalOpen] = useState(false);
  const [situationVar, setSituationVar] = useState<string | null>(null);
  const [situationSub, setSituationSub] = useState<string | null>(null);
  const [situationSeverity, setSituationSeverity] = useState<string | null>(null);
  const [situationFreeText, setSituationFreeText] = useState('');
  const [loading, setLoading] = useState(false);

  // ---- 출발지 선택 / AI 가중치 기반 최적경로 계산 ----
  const [originId, setOriginId] = useState<number | null>(null);
  // 일차마다 최적 경로 계산 결과를 따로 들고 있는다 — 그래야 전체보기에서 여러 일차를
  // 각각 계산해 둔 뒤 최단시간/최단거리를 토글해도 일차별로 그 결과가 그대로 반영된다.
  const [routeOptimizationByDay, setRouteOptimizationByDay] = useState<
    Record<number, RouteOptimizationState>
  >({});
  const [originSelectOpen, setOriginSelectOpen] = useState(false);
  const [originListExpanded, setOriginListExpanded] = useState(false);
  const [originChoiceId, setOriginChoiceId] = useState<number | null>(null);
  const [originConfirmOpen, setOriginConfirmOpen] = useState(false);
  const [noVariableModalOpen, setNoVariableModalOpen] = useState(false);
  const [pendingRouteOrigin, setPendingRouteOrigin] = useState<number | null>(null);
  const [addPlaceModalOpen, setAddPlaceModalOpen] = useState(false);
  // 전체보기에서 여행이 2일 이상이면, 일차마다 따로 "경로 계산"을 누르는 대신
  // 한 번에 일차별 출발지를 다 고르고 순서대로 계산한다.
  const [multiDayOriginModalOpen, setMultiDayOriginModalOpen] = useState(false);
  const [multiDayOriginChoices, setMultiDayOriginChoices] = useState<Record<number, number>>({});
  const [multiDayRunning, setMultiDayRunning] = useState(false);
  // "출발지가 방문지 목록에 없어요"를 눌러 방문지를 추가한 경우, 추가가 끝나면 출발지 선택
  // 팝업으로 돌아가서 방금 추가한 곳을 바로 고를 수 있게 한다.
  const [returnToOriginPickerAfterAdd, setReturnToOriginPickerAfterAdd] = useState(false);

  // ---- 협업 / 권한 ----
  const { isLoggedIn, isLoading: sessionLoading, user } = useSession();
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [role, setRole] = useState<ScheduleRole>('creator');

  // ---- 저장 안 된 변경사항 추적 ----
  // "마지막으로 불러오거나 저장한 상태"의 스냅샷과 현재 상태를 비교해서 dirty 여부를 정한다.
  // (state+effect로 변경을 감지하는 방식은, 초기 로드가 여러 단계 — 날짜 입력 모달, URL 파라미터,
  // 스케줄 조회 등 — 로 나뉘어 진행될 때 그 초기화 자체를 "사용자 변경"으로 오인했다.)
  const snapshotOf = (s: {
    places: Place[];
    segments: TransportMode[];
    criteria: RouteCriteria;
    tripStart: string;
    tripEnd: string;
  }) => JSON.stringify(s);
  const [isDirty, setIsDirty] = useState(false);
  const cleanSnapshotRef = useRef(snapshotOf({ places, segments, criteria, tripStart, tripEnd }));
  const markClean = useCallback(
    (override?: {
      places?: Place[];
      segments?: TransportMode[];
      criteria?: RouteCriteria;
      tripStart?: string;
      tripEnd?: string;
    }) => {
      cleanSnapshotRef.current = snapshotOf({
        places: override?.places ?? places,
        segments: override?.segments ?? segments,
        criteria: override?.criteria ?? criteria,
        tripStart: override?.tripStart ?? tripStart,
        tripEnd: override?.tripEnd ?? tripEnd,
      });
      setIsDirty(false);
    },
    [places, segments, criteria, tripStart, tripEnd],
  );
  // ref 비교는 렌더 중이 아니라 effect 안에서만 한다 (렌더 중 ref.current 읽기는 금지되어 있다).
  useEffect(() => {
    setIsDirty(
      snapshotOf({ places, segments, criteria, tripStart, tripEnd }) !== cleanSnapshotRef.current,
    );
  }, [places, segments, criteria, tripStart, tripEnd]);

  // 저장 안 된 변경사항이 있으면 새로고침/탭 닫기 시 브라우저 기본 확인창을 띄운다.
  // (방문지가 하나도 없으면 애초에 저장할 내용이 없으므로 물어보지 않는다 — saveCurrentRoute 와 기준을 맞춘다.)
  useEffect(() => {
    const canEditNow = role === 'creator' || role === 'editor';
    const hasSaveableContent = places.length > 0 || Boolean(scheduleId);
    if (!isDirty || !canEditNow || !hasSaveableContent) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, role, places.length, scheduleId]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [myEditRequestPending, setMyEditRequestPending] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [viewerInviteLink, setViewerInviteLink] = useState('');
  const [editorInviteLink, setEditorInviteLink] = useState('');
  const [viewerCopyLabel, setViewerCopyLabel] = useState('복사');
  const [editorCopyLabel, setEditorCopyLabel] = useState('복사');
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [requestConfirmOpen, setRequestConfirmOpen] = useState(false);
  const [requestConfirmId, setRequestConfirmId] = useState<string | null>(null);
  const [requestConfirmKind, setRequestConfirmKind] = useState<'approve' | 'reject' | null>(null);

  // ---- 저장 / 활동 로그 ----
  const [nickname, setNickname] = useState('나');
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [activityLog, setActivityLog] = useState<{ id: string; text: string; time: string }[]>([]);
  const [saveLabel, setSaveLabel] = useState('저장');
  const lastTitleRef = useRef('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // ---- AI 도우미 ----
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [addingRecommended, setAddingRecommended] = useState(false);
  // "몇 일차에 추가할까요?" 라고 되물은 뒤, 사용자가 일차를 답할 때까지 들고 있는 추천 장소들.
  const [pendingAddPlaces, setPendingAddPlaces] = useState<RecommendedPlace[] | null>(null);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      text: '안녕하세요! 경로를 계획하시면서 궁금한 점이 있으면 편하게 물어보세요.',
      suggestions: ['현재 경로 괜찮아?', '더 빠른 순서 있어?', '주변 추천해줘'],
    },
  ]);
  const aiMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = aiMessagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [aiMessages, aiLoading]);

  const canEdit = role === 'creator' || role === 'editor';
  const canManageInvite = role === 'creator' && Boolean(scheduleId);
  const canDeleteOriginal = role === 'creator' && Boolean(scheduleId);
  const isViewerRole = role === 'viewer';

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNickname(user.nickname || user.name);
    }
  }, [user]);

  // ---- 유틸 ----
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
  }, []);

  const logActivity = useCallback(
    (text: string) => {
      setActivityLog((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          text: `${nickname}님이 ${text}`,
          time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
    },
    [nickname],
  );

  const segmentCacheKeyFor = useCallback(
    (idx: number, mode: TransportMode, crit: RouteCriteria) => {
      const a = places[idx];
      const b = places[idx + 1];
      if (!a || !b) return `_${idx}`;
      return `${mode}_${a.id}_${b.id}_${crit}`;
    },
    [places],
  );

  /**
   * 일차별로 최단시간/최단거리 기준을 다르게 계산해뒀을 수 있으므로, 현재 선택된 기준으로
   * 계산한 값이 없으면 다른 기준으로 이미 계산해둔 값이라도 그대로 보여준다
   * (전체보기에서 각 일차마다 계산했던 결과가 그대로 남아있어야 하기 때문).
   */
  const getSegmentRouteCache = useCallback(
    (idx: number, mode?: TransportMode): CacheEntry | undefined => {
      const m = mode ?? segments[idx];
      const primary = routeCache[segmentCacheKeyFor(idx, m, criteria)];
      if (primary) return primary;
      const otherCriteria: RouteCriteria = criteria === 'time' ? 'distance' : 'time';
      return routeCache[segmentCacheKeyFor(idx, m, otherCriteria)];
    },
    [routeCache, segments, criteria, segmentCacheKeyFor],
  );

  // ---- Kakao 지도 ----
  useEffect(() => {
    let cancelled = false;
    loadKakaoMapsSdk()
      .then((kakao) => {
        if (cancelled || !mapRef.current) return;
        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(37.5665, 126.978),
          level: 6,
        });
        kakaoMapRef.current = map;
        setKakaoReady(true);
      })
      .catch((err) => {
        console.error('[map] failed to load Kakao SDK', err);
        if (!cancelled) setKakaoLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // 지도 인스턴스는 마운트 시 한 번만 생성한다.
  }, []);

  const syncKakaoMarkers = useCallback(() => {
    const kakao = window.kakao;
    const map = kakaoMapRef.current;
    if (!map || !kakao) return;
    kakaoMarkersRef.current.forEach((m) => m.setMap(null));
    kakaoMarkersRef.current = [];
    // 특정 일차를 선택 중이면 지도에도 그 일차의 방문지만 보여준다(전체보기일 때는 전부 표시).
    const withCoords = places.filter(
      (p) => p.x && p.y && (selectedDay === null || (p.day ?? 0) === selectedDay),
    );
    if (!withCoords.length) return;
    // 지도 핀 번호는 전체 순번이 아니라 일차별로 1부터 다시 매긴다.
    const dayCounters = new Map<number, number>();
    const orderByPlaceId = new Map<number, number>();
    places.forEach((p) => {
      const day = p.day ?? 0;
      const next = (dayCounters.get(day) ?? 0) + 1;
      dayCounters.set(day, next);
      orderByPlaceId.set(p.id, next);
    });
    const bounds = new kakao.maps.LatLngBounds();
    withCoords.forEach((p) => {
      const pos = new kakao.maps.LatLng(p.y as number, p.x as number);
      const marker = new kakao.maps.Marker({ position: pos, map });
      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: `<div style="background:#7BCB93;color:#12321F;font-size:11px;font-weight:700;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;transform:translateY(-28px)">${orderByPlaceId.get(p.id)}</div>`,
      });
      overlay.setMap(map);
      kakaoMarkersRef.current.push(marker, overlay);
      bounds.extend(pos);
    });
    map.setBounds(bounds);
  }, [places, selectedDay]);

  useEffect(() => {
    if (kakaoReady) syncKakaoMarkers();
  }, [kakaoReady, syncKakaoMarkers]);

  const syncKakaoPolyline = useCallback(() => {
    kakaoPolylinesRef.current.forEach((line) => line.setMap(null));
    kakaoPolylinesRef.current = [];
    const kakao = window.kakao;
    const map = kakaoMapRef.current;
    if (!map || !kakao) return;
    // 구간 하나가 실패해도 나머지 구간은 그대로 그린다 (전체를 한 선으로 합치지 않고
    // 실제 데이터가 있는 구간마다 따로따로 그려서 부분 실패에도 지도에 경로가 표시되게 한다).
    for (let idx = 0; idx < segments.length; idx++) {
      // 특정 일차를 선택 중이면 지도에도 그 일차 안에서 이어지는 구간만 그린다
      // (전체보기일 때는 모든 구간을 그대로 그린다).
      if (selectedDay !== null) {
        const fromDay = places[idx]?.day ?? 0;
        const toDay = places[idx + 1]?.day ?? 0;
        if (fromDay !== selectedDay || toDay !== selectedDay) continue;
      }
      const cache = getSegmentRouteCache(idx);
      if (!cache || 'failed' in cache || !cache.pathPoints?.length) continue;
      const path = cache.pathPoints.map((pt) => new kakao.maps.LatLng(pt.y, pt.x));
      if (path.length < 2) continue;
      const segmentDay = places[idx]?.day ?? 0;
      const line = new kakao.maps.Polyline({
        map,
        path,
        strokeWeight: 4,
        strokeColor: routeColorForDay(segmentDay),
        strokeOpacity: 0.85,
        strokeStyle: 'solid',
      });
      kakaoPolylinesRef.current.push(line);
    }
  }, [segments, places, selectedDay, getSegmentRouteCache]);

  useEffect(() => {
    if (kakaoReady) syncKakaoPolyline();
  }, [kakaoReady, syncKakaoPolyline]);

  const relayoutMapSoon = useCallback(() => {
    const map = kakaoMapRef.current;
    if (!map) return;
    requestAnimationFrame(() => {
      try {
        map.relayout();
      } catch (err) {
        console.error('[map] relayout failed', err);
      }
    });
  }, []);

  const applyScheduleDetail = useCallback(
    (detail: NonNullable<Awaited<ReturnType<typeof getSchedule>>>) => {
      lastTitleRef.current = detail.schedule.title;
      setPlaces(detail.schedule.places);
      setSegments(detail.schedule.segments);
      setRouteSegmentsReady(detail.schedule.segments.length > 0);
      // 불러온 방문지들의 id보다 다음 id가 항상 커야, 새로 추가하는 방문지가 기존 id와
      // 겹치지 않는다 (겹치면 리액트 key 충돌로 목록/구간 렌더링이 깨진다).
      nextIdRef.current = nextIdAfter(detail.schedule.places);
      setCriteriaState(detail.schedule.criteria);
      setTripStart(detail.schedule.tripStart || '');
      setTripEnd(detail.schedule.tripEnd || '');
      setScheduleId(detail.schedule.id);
      setRole(detail.role);
      setMembers(
        detail.members.map((m, i) => ({ id: `${i}`, nickname: m.nickname, role: m.role })),
      );
      setEditRequests(
        detail.editRequests.map((r) => ({ id: r.id, nickname: r.nickname, time: r.createdAt })),
      );
      setMyEditRequestPending(detail.myEditRequestPending);
      markClean({
        places: detail.schedule.places,
        segments: detail.schedule.segments,
        criteria: detail.schedule.criteria,
        tripStart: detail.schedule.tripStart || '',
        tripEnd: detail.schedule.tripEnd || '',
      });
    },
    [markClean],
  );

  // ---- 초대 링크로 들어온 경우: 로그인 상태면 바로 참여, 아니면 로그인 후 이어서 참여 ----
  const PENDING_INVITE_KEY = 'pd-pending-invite';

  useEffect(() => {
    if (sessionLoading) return;

    const inviteToken = searchParams.get('invite');
    const inviteRole = searchParams.get('role');
    const isInviteRole = inviteRole === 'editor' || inviteRole === 'viewer';

    if (inviteToken && isInviteRole) {
      if (!isLoggedIn) {
        if (inviteRole === 'viewer') {
          // 보기 전용 링크는 로그인 없이 바로 볼 수 있다. 참여 등록은 하지 않는다 — 저장하려면 그때 로그인.
          getScheduleByViewToken(inviteToken).then((schedule) => {
            if (!schedule) {
              showToast('초대 링크가 유효하지 않아요.');
              return;
            }
            setPlaces(schedule.places);
            setSegments(schedule.segments);
            setRouteSegmentsReady(schedule.segments.length > 0);
            nextIdRef.current = nextIdAfter(schedule.places);
            setCriteriaState(schedule.criteria);
            setTripStart(schedule.tripStart || '');
            setTripEnd(schedule.tripEnd || '');
            setScheduleId(schedule.id);
            setRole('viewer');
            markClean({
              places: schedule.places,
              segments: schedule.segments,
              criteria: schedule.criteria,
              tripStart: schedule.tripStart || '',
              tripEnd: schedule.tripEnd || '',
            });
          });
          return;
        }
        // 편집 가능 링크는 로그인부터 해야 한다 — 로그인 후 이어서 참여를 시도한다.
        sessionStorage.setItem(
          PENDING_INVITE_KEY,
          JSON.stringify({ token: inviteToken, role: inviteRole }),
        );
        router.push('/login');
        return;
      }
      joinSchedule(inviteToken, inviteRole).then((result) => {
        if (!result) {
          showToast('초대 링크가 유효하지 않아요.');
          return;
        }
        router.replace(`/planner?loadRoute=${result.scheduleId}`);
        if (result.pending) showToast('편집 권한 요청을 보냈어요. 제작자 승인을 기다려주세요.');
      });
      return;
    }

    if (isLoggedIn) {
      const pendingRaw = sessionStorage.getItem(PENDING_INVITE_KEY);
      if (pendingRaw) {
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        try {
          const pending = JSON.parse(pendingRaw) as { token: string; role: 'editor' | 'viewer' };
          joinSchedule(pending.token, pending.role).then((result) => {
            if (!result) return;
            router.replace(`/planner?loadRoute=${result.scheduleId}`);
            if (result.pending) showToast('편집 권한 요청을 보냈어요. 제작자 승인을 기다려주세요.');
          });
          return;
        } catch {
          // 손상된 값이면 무시하고 아래 일반 로드 흐름으로 진행한다.
        }
      }
    }

    const loadId = searchParams.get('loadRoute');
    if (loadId) {
      getSchedule(loadId).then((detail) => {
        if (detail) applyScheduleDetail(detail);
        else showToast('일정을 불러오지 못했어요.');
      });
    }
    const qStart = searchParams.get('tripStart');
    const qEnd = searchParams.get('tripEnd');
    const resolvedTripStart = qStart || '';
    const resolvedTripEnd = qEnd || qStart || '';
    if (qStart || qEnd) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTripStart(resolvedTripStart);
      setTripEnd(resolvedTripEnd);
      // "새 일정 만들기" 날짜 모달 없이 URL로 바로 날짜가 정해진 경우라, 이 시점을 기준으로 삼는다.
      markClean({ tripStart: resolvedTripStart, tripEnd: resolvedTripEnd });
    }
    if (isNewRoute && !hasTripDateParam) setNewTripDateModalOpen(true);

    if (searchParams.get('mode') === 'ai') {
      const handoff = consumeAiRouteHandoff();
      if (handoff) {
        setPlaces(handoff.places);
        setSegments(handoff.segments);
        setRouteSegmentsReady(handoff.segments.length > 0);
        nextIdRef.current = nextIdAfter(handoff.places);
        // AI가 만들어준 동선은 아직 저장 전이므로 dirty로 유지한다(markClean 호출 안 함) —
        // 이대로 나가면 방금 만든 내용을 잃을 수 있으니 저장 확인을 받는 게 맞다.
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps -- 로그인 상태가 확정될 때 한 번만 실행
  }, [sessionLoading, isLoggedIn]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (permissionsModalOpen) setPermissionsModalOpen(false);
      else if (requestConfirmOpen) setRequestConfirmOpen(false);
      else if (editModalOpen) setEditModalOpen(false);
      else if (categoryModalOpen) setCategoryModalOpen(false);
      else if (addConfirmOpen) {
        setAddConfirmOpen(false);
        setReturnToOriginPickerAfterAdd(false);
      } else if (situationModalOpen) setSituationModalOpen(false);
      else if (variableDayPickerOpen) setVariableDayPickerOpen(false);
      else if (deleteConfirmOpen) setDeleteConfirmOpen(false);
      else if (noVariableModalOpen) setNoVariableModalOpen(false);
      else if (addPlaceModalOpen) {
        setAddPlaceModalOpen(false);
        setReturnToOriginPickerAfterAdd(false);
      } else if (multiDayOriginModalOpen) setMultiDayOriginModalOpen(false);
      else if (originConfirmOpen) setOriginConfirmOpen(false);
      else if (originSelectOpen) setOriginSelectOpen(false);
      else if (leaveConfirmOpen) setLeaveConfirmOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    permissionsModalOpen,
    requestConfirmOpen,
    editModalOpen,
    categoryModalOpen,
    addConfirmOpen,
    situationModalOpen,
    variableDayPickerOpen,
    deleteConfirmOpen,
    originSelectOpen,
    originConfirmOpen,
    noVariableModalOpen,
    addPlaceModalOpen,
    multiDayOriginModalOpen,
    leaveConfirmOpen,
  ]);

  // ---- 방문지 CRUD ----
  const geocodePlace = async (query: string) => {
    try {
      const data = await searchKeyword(query);
      const doc = data.documents?.[0];
      if (!doc) return null;
      return { x: Number(doc.x), y: Number(doc.y) };
    } catch (err) {
      console.error('geocodePlace failed:', err);
      return null;
    }
  };

  /** 검색 결과에서 실존하는(Kakao에 등록된) 장소만 추가할 수 있다 — 존재하지 않는 장소는 입력할 수 없다. */
  const addSelectedPlace = (doc: KakaoPlaceDoc, nameOverride?: string): Place => {
    const day = selectedDay ?? 0;
    const name = nameOverride?.trim() || doc.place_name;
    const newPlace: Place = {
      id: allocatePlaceId(),
      name,
      category: doc.category_group_name || '미분류',
      address: doc.road_address_name || doc.address_name,
      roadAddress: doc.road_address_name,
      jibunAddress: doc.address_name,
      placeId: doc.id,
      x: Number(doc.x),
      y: Number(doc.y),
      duration: 15,
      hours: 'unknown',
      hoursLabel: '영업시간 확인 필요',
      visitTime: '',
      packItems: '',
      weather: 'sunny',
      day,
    };
    const next = [...places, newPlace];
    setPlaces(next);
    setSegments(resizeSegments(next, segments));
    // 방문지를 새로 추가하면 아직 이 방문지를 반영한 경로가 계산되지 않은 상태이므로
    // 이동수단 표시는 숨기고, "경로 계산"을 눌러야 다시 나타나게 한다.
    setRouteSegmentsReady(false);
    setNewAddress('');
    setPendingSelectedDoc(null);
    setRouteCache({});
    logActivity(`${name}을 추가했습니다`);
    showToast('방문지가 일정에 추가됐어요');
    return newPlace;
  };

  /** 검색 결과 항목을 클릭하면 바로 "방문지를 추가할까요?" 팝업을 정해진 상태로 띄운다. */
  const openAddConfirmForDoc = (doc: KakaoPlaceDoc) => {
    selectMapResult(doc);
    setPendingSelectedDoc(doc);
    setPendingName(doc.place_name);
    setPendingAddress(doc.road_address_name || doc.address_name);
    setAddConfirmOpen(true);
  };

  /** 방문지 추가를 취소하면, 출발지 선택 흐름에서 들어온 것이었어도 그 흐름은 그냥 끝난다. */
  const cancelAddConfirm = () => {
    setAddConfirmOpen(false);
    setReturnToOriginPickerAfterAdd(false);
  };
  const cancelAddPlaceModal = () => {
    setAddPlaceModalOpen(false);
    setReturnToOriginPickerAfterAdd(false);
  };

  const confirmAddPlace = () => {
    if (!pendingSelectedDoc) return;
    const name = pendingName.trim();
    if (!name) return;
    const added = addSelectedPlace(pendingSelectedDoc, name);
    setAddConfirmOpen(false);
    setPendingAddress('');
    setPendingName('');
    // 출발지 선택 흐름에서 들어온 추가라면, 목록 선택 팝업으로 되돌아가지 않고 방금 추가한
    // 곳을 출발지로 바로 확정하는 팝업("출발지를 OOO로 설정하시겠습니까?")으로 곧장 이어간다 —
    // 경로 계산 버튼을 다시 누르거나 목록에서 또 골라야 하는 단계를 없앤다.
    if (returnToOriginPickerAfterAdd) {
      setReturnToOriginPickerAfterAdd(false);
      setOriginChoiceId(added.id);
      setOriginConfirmOpen(true);
    }
  };

  const deletePlace = (id: number) => {
    const place = places.find((p) => p.id === id);
    const next = places.filter((p) => p.id !== id);
    setPlaces(next);
    setSegments(resizeSegments(next, segments));
    // 방문지를 삭제하면 남은 방문지 사이의 인접 관계가 바뀌므로 이동수단 표시를 숨긴다.
    setRouteSegmentsReady(false);
    if (place) logActivity(`${place.name}을(를) 삭제했습니다`);
    // 출발지로 지정했던 방문지를 삭제하면 다음 경로 계산에서 출발지를 다시 고를 수 있도록 초기화한다.
    if (id === originId) setOriginId(null);
    const deletedDay = place?.day ?? 0;
    setRouteOptimizationByDay((prev) => {
      if (prev[deletedDay]?.originId !== id) return prev;
      const next = { ...prev };
      delete next[deletedDay];
      return next;
    });
  };

  const onDeleteClick = (id: number) => {
    const place = places.find((p) => p.id === id);
    if (!place) return;
    setDeleteTargetId(id);
    setDeleteTargetLabel(place.name);
    setDeleteConfirmOpen(true);
  };
  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    setDeleteAgreeChecked(false);
  };
  const clearAllPlaces = () => {
    if (places.length === 0) return;
    setDeleteTargetId('ALL');
    setDeleteTargetLabel('방문지 전체');
    setDeleteConfirmOpen(true);
  };
  const deleteOriginalRoute = () => {
    setDeleteTargetId('ORIGINAL_ROUTE');
    setDeleteTargetLabel('이 원본 일정');
    setDeleteConfirmOpen(true);
  };

  // ---- 일정 날짜 변경 ----
  const openDateEditModal = () => {
    setDraftTripStart(tripStart);
    setDraftTripEnd(tripEnd || tripStart);
    setDateEditModalOpen(true);
  };
  const confirmDateEdit = async () => {
    if (!scheduleId) {
      setDateEditModalOpen(false);
      return;
    }
    const updated = await updateSchedule(scheduleId, {
      tripStart: draftTripStart,
      tripEnd: draftTripEnd,
    });
    setDateEditModalOpen(false);
    if (!updated) {
      showToast('날짜를 변경하지 못했어요. 다시 시도해주세요.');
      return;
    }
    setTripStart(updated.tripStart || draftTripStart);
    setTripEnd(updated.tripEnd || draftTripEnd);
    logActivity(`일정 날짜를 ${updated.tripStart} ~ ${updated.tripEnd}(으)로 변경했습니다`);
    showToast('일정 날짜가 변경되었어요');
  };
  const confirmDelete = async () => {
    if (deleteTargetId === 'ORIGINAL_ROUTE' && !deleteAgreeChecked) return;
    if (deleteTargetId === 'ALL') {
      const count = places.length;
      setPlaces([]);
      setSegments([]);
      setRouteSegmentsReady(false);
      logActivity(`방문지 ${count}곳을 모두 삭제했습니다 (초기화)`);
    } else if (deleteTargetId === 'ORIGINAL_ROUTE') {
      if (scheduleId) {
        const ok = await deleteSchedule(scheduleId);
        if (!ok) {
          showToast('삭제하지 못했어요. 다시 시도해주세요.');
          closeDeleteConfirm();
          return;
        }
      }
      showToast('원본 일정을 삭제했어요');
      closeDeleteConfirm();
      router.push('/routes');
      return;
    } else if (deleteTargetId != null) {
      deletePlace(deleteTargetId);
    }
    closeDeleteConfirm();
  };

  const openEditModal = (id: number) => {
    const place = places.find((p) => p.id === id);
    if (!place) return;
    setEditingId(id);
    setEditName(place.name);
    setEditAddress(place.address);
    setEditModalOpen(true);
  };
  const saveEditModal = () => {
    const name = editName.trim();
    const address = editAddress.trim();
    if (!name || !address || editingId == null) return;
    setPlaces((prev) => prev.map((p) => (p.id === editingId ? { ...p, name, address } : p)));
    setEditModalOpen(false);
    setEditingId(null);
    logActivity(`방문지 정보를 "${name}"(으)로 수정했습니다`);
  };

  const openCategoryModal = (id: number) => {
    setCategoryTargetId(id);
    setCategoryModalOpen(true);
  };
  const selectCategory = (category: string) => {
    const place = places.find((p) => p.id === categoryTargetId);
    setPlaces((prev) => prev.map((p) => (p.id === categoryTargetId ? { ...p, category } : p)));
    setCategoryModalOpen(false);
    setCategoryTargetId(null);
    if (place) logActivity(`${place.name}의 카테고리를 ${category}(으)로 설정했습니다`);
  };

  const togglePlaceExpand = (id: number) =>
    setExpandedPlaces((prev) => ({ ...prev, [id]: !prev[id] }));
  const updatePackItems = (id: number, value: string) => {
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, packItems: value } : p)));
    setSavedMemoIds((prev) => ({ ...prev, [id]: false }));
  };
  const saveMemo = (id: number) => {
    const place = places.find((p) => p.id === id);
    setSavedMemoIds((prev) => ({ ...prev, [id]: true }));
    if (place) logActivity(`${place.name}의 메모를 저장했습니다`);
  };
  const changeDuration = (id: number, delta: number) => {
    const place = places.find((p) => p.id === id);
    setPlaces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, duration: Math.max(5, p.duration + delta) } : p)),
    );
    if (place)
      logActivity(
        `${place.name}의 체류시간을 ${Math.max(5, place.duration + delta)}분으로 변경했습니다`,
      );
  };

  const onDragStart = (idx: number) => setDragIndex(idx);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (idx: number) => {
    const wasDragging = dragIndex !== null && dragIndex !== idx;
    if (dragIndex === null || dragIndex === idx) return;
    // 전체보기에서는 일차 경계를 넘어 순서가 섞이면 일차 구분이 무너지므로, 같은 일차
    // 안에서의 순서 변경만 허용한다(다른 일차로 드롭하면 무시).
    const fromDay = places[dragIndex]?.day ?? 0;
    const toDay = places[idx]?.day ?? 0;
    if (fromDay !== toDay) {
      setDragIndex(null);
      return;
    }
    const arr = [...places];
    const [moved] = arr.splice(dragIndex, 1);
    arr.splice(idx, 0, moved);
    setPlaces(arr);
    setSegments(resizeSegments(arr, segments));
    // 방문지 순서를 스위치하면 구간(이동수단)이 어느 방문지 사이 것인지 더 이상 유효하지 않으므로
    // 경로를 다시 계산할 때까지 이동수단 표시를 숨긴다.
    setRouteSegmentsReady(false);
    setDragIndex(null);
    setRouteCache({});
    if (wasDragging) logActivity('방문 순서를 변경했습니다');
  };
  const onDragEnd = () => setDragIndex(null);

  // ---- 구간(이동수단) ----
  const cycleSegmentMode = (idx: number) => {
    const cur = segments[idx];
    const next = MODE_ORDER[(MODE_ORDER.indexOf(cur) + 1) % MODE_ORDER.length];
    setSegments((prev) => prev.map((m, i) => (i === idx ? next : m)));
    logActivity(`${idx + 1}-${idx + 2} 구간의 이동수단을 변경했습니다`);
  };
  const applyModeToAll = (mode: TransportMode) => {
    if (lastAppliedMode === mode) {
      setLastAppliedMode(null);
      return;
    }
    setSegments((prev) => prev.map(() => mode));
    setLastAppliedMode(mode);
    logActivity('전체 구간 이동수단을 일괄 변경했습니다');
  };
  const toggleSegmentExpand = (idx: number) =>
    setExpandedSegments((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const fetchSegmentRouteForModeWithCriteria = useCallback(
    async (idx: number, mode: TransportMode, crit: RouteCriteria) => {
      const a = places[idx];
      const b = places[idx + 1];
      const key = `${mode}_${a?.id}_${b?.id}_${crit}`;
      if (!a || !b || a.x == null || a.y == null || b.x == null || b.y == null) {
        setRouteCache((prev) => ({
          ...prev,
          [key]: { failed: true, errorMsg: '방문지 좌표가 없어 경로를 조회할 수 없습니다' },
        }));
        return;
      }
      if (routeCache[key]) return;
      try {
        const data = await fetchRouteLeg(mode, {
          originX: a.x,
          originY: a.y,
          destX: b.x,
          destY: b.y,
          priority: crit,
        });
        setRouteCache((prev) => ({ ...prev, [key]: data }));
      } catch (err) {
        console.error(`fetchSegmentRoute(${mode}) failed:`, err);
        const errorMsg =
          err instanceof KakaoApiError ? err.message : '경로 정보를 불러오지 못했습니다';
        setRouteCache((prev) => ({
          ...prev,
          [key]: { failed: true, errorMsg },
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- routeCache 는 캐시 존재 확인용으로만 읽는다
    [places],
  );

  const searchAllRoutes = async () => {
    if (routeSearching || segments.length < 1) return;
    setRouteSearching(true);
    const tasks: (() => Promise<void>)[] = [];
    for (let idx = 0; idx < segments.length; idx++) {
      for (const mode of MODE_ORDER)
        tasks.push(() => fetchSegmentRouteForModeWithCriteria(idx, mode, criteria));
    }
    // 방문지 수 × 이동수단 4종 요청을 한 번에 다 쏘면 카카오 API 요청 속도 제한에 걸려
    // 일부(특히 도보/대중교통/자전거)가 조회 실패로 남는다 — 동시 요청 수를 제한한다.
    await runWithConcurrencyLimit(tasks, 4);
    setRouteSearching(false);
    syncKakaoPolyline();
    logActivity('경로를 검색했습니다');
    showToast('실제 경로 검색이 완료됐어요');
  };

  // ---- 상황 변경 ----
  const openSituationModal = () => {
    setSituationVar(null);
    setSituationSub(null);
    setSituationSeverity(null);
    setSituationFreeText('');
    setSituationModalOpen(true);
  };

  const applySituationRuleBased = () => {
    if (!situationVar || !situationSeverity) return;
    if (situationVar === 'weather' && !situationSub) return;
    const sevWeight = SEVERITY_LEVELS.find((s) => s.id === situationSeverity)?.weight ?? 1;
    setSituationModalOpen(false);
    setLoading(true);
    setTimeout(() => {
      const result = applySituationAdjustment(
        situationVar,
        situationSub,
        sevWeight,
        places,
        segments,
      );
      setPlaces(result.places);
      setSegments(result.segments);
      setRouteSegmentsReady(true);
      setLoading(false);
      const varLabel = SITUATION_VARS.find((v) => v.id === situationVar)?.label ?? situationVar;
      const sevLabel = SEVERITY_LEVELS.find((s) => s.id === situationSeverity)?.label ?? '';
      logActivity(`상황 변경(${varLabel} · ${sevLabel})에 맞춰 동선을 재계산했습니다`);
      showToast('변경된 상황을 동선에 반영했어요');
    }, 800);
  };

  const applySituationWithAi = async () => {
    const text = situationFreeText.trim();
    if (!text || places.length < 2) return;
    setSituationModalOpen(false);
    setLoading(true);
    try {
      const result = await requestAiRouteAdjustment(
        text,
        places.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          duration: p.duration,
        })),
        segments,
      );
      const placeById = new Map(places.map((p) => [p.id, p]));
      const newPlaces = result.order
        .map((id) => placeById.get(id))
        .filter((p): p is Place => Boolean(p));
      const newSegments = result.segments.map((m) =>
        (MODE_ORDER as string[]).includes(m) ? (m as TransportMode) : 'car',
      );
      if (newPlaces.length === places.length) {
        setPlaces(newPlaces);
        setSegments(newSegments);
        setRouteSegmentsReady(true);
        setRouteCache({});
      }
      logActivity(`AI 상황 반영: "${text}" → ${result.note || '동선을 재구성했습니다'}`);
      showToast(result.note || '변경된 상황을 동선에 반영했어요');
    } catch (err) {
      console.error('applySituationWithAi failed:', err);
      showToast('AI 응답을 가져오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
      setSituationFreeText('');
    }
  };

  const applySituation = () => {
    if (situationFreeText.trim()) {
      void applySituationWithAi();
      return;
    }
    applySituationRuleBased();
  };

  // ---- 지도 검색 모드 ----
  const clearSearchMarker = () => {
    if (searchMarkerRef.current) {
      searchMarkerRef.current.setMap(null);
      searchMarkerRef.current = null;
    }
  };
  const openSearchMode = () => {
    if (searchMode || isAllDaysView) return;
    setSearchMode(true);
    setMapSearchBarCollapsed(false);
    setMapSearchQuery(newAddress);
    setMapSearchResults([]);
    setMapSearchError(null);
  };
  /** 출발지 선택 팝업에서 "출발지가 방문지 목록에 없어요"를 눌렀을 때 여는 주소 추가 카드. */
  const openAddPlaceModal = () => {
    setMapSearchQuery('');
    setMapSearchResults([]);
    setMapSearchError(null);
    setAddPlaceModalOpen(true);
  };
  const toggleMapSearchCollapsed = () => setMapSearchBarCollapsed((prev) => !prev);
  const clearMapSearchQuery = () => {
    clearSearchMarker();
    setMapSearchQuery('');
    setMapSearchResults([]);
    setMapSearchError(null);
  };
  const runMapSearch = async () => {
    const query = mapSearchQuery.trim();
    if (!query) return;
    setMapSearchLoading(true);
    setMapSearchError(null);
    setMapSearchResults([]);
    clearSearchMarker();
    try {
      const data = await searchKeyword(query);
      const docs = data.documents ?? [];
      setMapSearchResults(docs);
      if (!docs.length) setMapSearchError('검색 결과가 없어요');
    } catch (err) {
      console.error('runMapSearch failed:', err);
      setMapSearchError('검색에 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setMapSearchLoading(false);
    }
  };
  const selectMapResult = (doc: KakaoPlaceDoc) => {
    const kakao = window.kakao;
    if (kakaoMapRef.current && kakao) {
      const pos = new kakao.maps.LatLng(Number(doc.y), Number(doc.x));
      kakaoMapRef.current.setCenter(pos);
      kakaoMapRef.current.setLevel(4);
      clearSearchMarker();
      searchMarkerRef.current = new kakao.maps.Marker({ position: pos, map: kakaoMapRef.current });
    }
  };

  // ---- 레이아웃 토글 ----
  const togglePanelCollapsed = () => {
    setPanelCollapsed((prev) => {
      const next = !prev;
      if (next) setMapCollapsed(false);
      return next;
    });
    relayoutMapSoon();
  };
  const toggleMapCollapsed = () => {
    setMapCollapsed((prev) => {
      const next = !prev;
      if (next) setPanelCollapsed(false);
      return next;
    });
    relayoutMapSoon();
  };

  // ---- 저장 / 내 일정 ----
  const saveCurrentRoute = async (): Promise<boolean> => {
    if (places.length === 0 && !scheduleId) return false;
    // 처음 저장할 때는 제목을 설정한 여행 기간으로 만든다. 이미 저장된 일정을 업데이트할 때는
    // 기존 제목을 그대로 유지한다(방문지 목록/일정만 갱신되는 구조).
    const title = lastTitleRef.current || fmtRange(tripStart, tripEnd) || '내 일정';
    const input = {
      title,
      places,
      segments,
      criteria,
      tripStart: tripStart || '',
      tripEnd: tripEnd || '',
    };

    const saved = scheduleId
      ? await updateSchedule(scheduleId, input)
      : await createSchedule(input);
    if (!saved) {
      showToast('저장하지 못했어요. 다시 시도해주세요.');
      return false;
    }
    if (!scheduleId) setScheduleId(saved.id);
    lastTitleRef.current = saved.title;
    setSaveLabel('저장됨');
    logActivity(`현재 일정을 "${saved.title}"으로 저장했습니다`);
    setTimeout(() => setSaveLabel('저장'), 1500);
    markClean();
    return true;
  };

  const saveOrRemoveAction = async () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (role === 'viewer') {
      if (!scheduleId) return;
      const ok = await deleteSchedule(scheduleId);
      if (ok) {
        showToast('내 일정에서 제거했어요');
        router.push('/routes');
      }
      return;
    }
    await saveCurrentRoute();
    showToast('내 일정에 저장했어요');
  };

  /** 저장 안 된 변경사항이 있는 상태로 페이지를 나가려 할 때 가로챈다. */
  const guardLeave = (href: string, e: React.MouseEvent) => {
    const canEditNow = role === 'creator' || role === 'editor';
    const hasSaveableContent = places.length > 0 || Boolean(scheduleId);
    if (!isDirty || !canEditNow || !hasSaveableContent) return;
    e.preventDefault();
    setLeaveTargetHref(href);
    setLeaveConfirmOpen(true);
  };
  const leaveWithoutSaving = () => {
    setLeaveConfirmOpen(false);
    markClean();
    router.push(leaveTargetHref);
  };
  const saveAndLeave = async () => {
    const wasExisting = Boolean(scheduleId);
    const ok = await saveCurrentRoute();
    setLeaveConfirmOpen(false);
    if (ok) {
      showToast(wasExisting ? '수정한 내용을 저장했어요' : '내 일정에 저장했어요');
      router.push(leaveTargetHref);
    }
  };

  // ---- 권한 / 초대 ----
  const askApproveRequest = (id: string) => {
    setRequestConfirmId(id);
    setRequestConfirmKind('approve');
    setRequestConfirmOpen(true);
  };
  const askRejectRequest = (id: string) => {
    setRequestConfirmId(id);
    setRequestConfirmKind('reject');
    setRequestConfirmOpen(true);
  };
  const confirmRequestAction = async () => {
    if (!scheduleId || !requestConfirmId || !requestConfirmKind) return;
    await resolveEditRequest(scheduleId, requestConfirmId, requestConfirmKind);
    const detail = await getSchedule(scheduleId);
    if (detail) applyScheduleDetail(detail);
    setRequestConfirmOpen(false);
    setRequestConfirmId(null);
    setRequestConfirmKind(null);
  };
  const copyInviteLink = async (role: 'viewer' | 'editor', existingLink: string) => {
    if (!scheduleId) return;
    const setLink = role === 'editor' ? setEditorInviteLink : setViewerInviteLink;
    const setLabel = role === 'editor' ? setEditorCopyLabel : setViewerCopyLabel;
    let link = existingLink;
    if (!link) {
      const fetched = await getInviteLink(scheduleId, role);
      if (!fetched) {
        showToast('초대 링크를 만들지 못했어요.');
        return;
      }
      link = fetched;
      setLink(link);
    }
    navigator.clipboard?.writeText(link).catch(() => {});
    setLabel('복사됨');
    setTimeout(() => setLabel('복사'), 1200);
  };

  useEffect(() => {
    if (!inviteOpen || !scheduleId) return;
    if (!viewerInviteLink) {
      getInviteLink(scheduleId, 'viewer').then((link) => {
        if (link) setViewerInviteLink(link);
      });
    }
    if (!editorInviteLink) {
      getInviteLink(scheduleId, 'editor').then((link) => {
        if (link) setEditorInviteLink(link);
      });
    }
  }, [inviteOpen, scheduleId, viewerInviteLink, editorInviteLink]);
  const requestEditPermission = async () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (!scheduleId) return;
    const ok = await apiRequestEditPermission(scheduleId);
    if (ok) {
      setMyEditRequestPending(true);
      showToast('편집 권한을 요청했어요');
    }
  };

  // ---- AI 도우미 ----
  const buildRouteContext = () => ({
    places: places.map((p, i) => ({
      order: i + 1,
      name: p.name,
      address: p.address,
      durationMin: p.duration,
    })),
    segments: segments.map((mode, i) => {
      const cache = getSegmentRouteCache(i);
      const ok = cache && !('failed' in cache);
      return {
        from: places[i]?.name,
        to: places[i + 1]?.name,
        mode,
        distanceKm: ok ? (cache as RouteLeg).distanceKm : null,
        minutes: ok ? (cache as RouteLeg).minutes : null,
      };
    }),
    routeCriteria: criteria,
    tripStart,
    tripEnd,
  });
  const sendAiMessage = async (overrideText?: string) => {
    const text = (overrideText ?? aiInput).trim();
    if (!text) return;
    const history = aiMessages.slice(-6);
    setAiMessages((prev) => [...prev, { role: 'user', text }]);
    setAiInput('');
    setAiLoading(true);
    try {
      const res = await askAssistant(text, history, buildRouteContext());
      const explicitDay = extractDayNumber(text);
      const tripDayCountNow = tripDayCount(tripStart, tripEnd);

      if (pendingAddPlaces && explicitDay !== null && explicitDay < tripDayCountNow) {
        // "몇 일차에 추가할까요?"에 대한 답 — 새로 받은 응답과 별개로, 들고 있던 추천을 그 일차에 반영한다.
        setAiMessages((prev) => [
          ...prev,
          { role: 'ai', text: res.reply, suggestions: buildSuggestionChips(res.suggestions) },
        ]);
        void addRecommendedPlaces(pendingAddPlaces, explicitDay);
        setPendingAddPlaces(null);
      } else {
        setAiMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: res.reply,
            suggestions: buildSuggestionChips(res.suggestions),
            recommendedPlaces: res.recommendedPlaces,
          },
        ]);
        // 사용자가 채팅으로 직접 "추가해줘"/"수정해줘"라고 명령한 경우에만 바로 동선에 반영한다.
        if (res.recommendedPlaces.length && isRouteCommandMessage(text)) {
          const isPureAddition = res.recommendedPlaces.every((p) => !p.replaces);
          if (isPureAddition && tripDayCountNow > 1 && explicitDay === null) {
            // 순수 추가인데 몇 일차인지 모른다 — 물어보고 답을 기다린다.
            setPendingAddPlaces(res.recommendedPlaces);
            setAiMessages((prev) => [...prev, { role: 'ai', text: '몇 일차에 추가할까요?' }]);
          } else {
            setPendingAddPlaces(null);
            void addRecommendedPlaces(res.recommendedPlaces, explicitDay ?? undefined);
          }
        }
      }
    } catch (err) {
      console.error('sendAiMessage failed:', err);
      setAiMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'AI 응답을 가져오지 못했어요. 잠시 후 다시 시도해주세요.' },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const addRecommendedPlaces = async (recs: RecommendedPlace[], dayOverride?: number) => {
    if (!recs.length || addingRecommended) return;
    setAddingRecommended(true);

    // 먼저 전부 지오코딩부터 끝낸다 (경로 배열은 아래에서 한 번에 반영).
    const resolved: { rec: RecommendedPlace; x: number | null; y: number | null }[] = [];
    for (const rec of recs) {
      const query = rec.address ? `${rec.name} ${rec.address}` : rec.name;
      const geo = await geocodePlace(query);
      resolved.push({ rec, x: geo?.x ?? null, y: geo?.y ?? null });
    }

    const nextPlaces = [...places];
    let replaced = 0;
    let added = 0;

    for (const { rec, x, y } of resolved) {
      const targetIdx = rec.replaces ? nextPlaces.findIndex((p) => p.name === rec.replaces) : -1;
      if (targetIdx !== -1) {
        // 지목된 기존 방문지만 바꾸고, 그 자리(순서/일차/체류시간 등)는 그대로 둔다.
        nextPlaces[targetIdx] = {
          ...nextPlaces[targetIdx],
          name: rec.name,
          address: rec.address || rec.name,
          x,
          y,
        };
        replaced += 1;
      } else {
        const newPlace: Place = {
          id: allocatePlaceId(),
          name: rec.name,
          category: '미분류',
          address: rec.address || rec.name,
          duration: 15,
          hours: 'unknown',
          hoursLabel: '영업시간 확인 필요',
          visitTime: '',
          packItems: '',
          weather: 'sunny',
          day: dayOverride ?? selectedDay ?? 0,
          x,
          y,
        };
        // 전체보기에서 새 방문지가 엉뚱하게 맨 끝에 따로 떨어져 보이지 않도록,
        // 같은 일차의 마지막 방문지 바로 뒤에 끼워 넣는다 (해당 일차가 아직 없으면 끝에 붙인다).
        let insertAt = nextPlaces.length;
        for (let i = nextPlaces.length - 1; i >= 0; i--) {
          if (nextPlaces[i].day === newPlace.day) {
            insertAt = i + 1;
            break;
          }
        }
        nextPlaces.splice(insertAt, 0, newPlace);
        added += 1;
      }
    }

    const finalPlaces = nextPlaces;
    setPlaces(finalPlaces);
    setSegments(resizeSegments(finalPlaces, segments));
    // 방문지가 새로 추가됐으면 경로를 다시 계산할 때까지 이동수단 표시를 숨긴다.
    if (added > 0) setRouteSegmentsReady(false);
    setRouteCache({});

    const parts: string[] = [];
    if (replaced) parts.push(`${replaced}곳 교체`);
    if (added) parts.push(`${added}곳 추가`);
    const dayLabel = dayOverride != null ? `${dayOverride + 1}일차에 ` : '';
    const summary = parts.join(', ') || '변경 없음';
    logActivity(
      `AI 추천으로 ${dayLabel}동선을 수정했습니다 (${summary}) — 방문 순서 번호가 갱신됐어요`,
    );
    showToast(`${dayLabel}동선을 수정했어요 (${summary})`);
    setAddingRecommended(false);
  };

  // ---- 파생 값 ----
  const dayCount = tripDayCount(tripStart, tripEnd);
  const hasDayTabs = dayCount > 1;
  const dayTabs = hasDayTabs
    ? Array.from({ length: dayCount }, (_, di) => ({ value: di, label: `${di + 1}일차` }))
    : [];
  /** 전체보기(모든 일차를 한 번에 보는 상태) — 일차 경계가 모호해지는 동작은 모두 막는다. */
  const isAllDaysView = hasDayTabs && selectedDay === null;

  const enrichedSegments = useMemo(
    () =>
      segments.map((mode, idx) => {
        const fromP = places[idx];
        const toP = places[idx + 1];
        const cached = getSegmentRouteCache(idx, mode);
        const hasRealCoords = Boolean(fromP?.x && fromP?.y && toP?.x && toP?.y);
        let steps: SegmentStep[];
        let status: 'ok' | 'unsearched' | 'failed' = 'ok';
        let errorMsg: string | undefined;

        if (cached && !('failed' in cached)) {
          if (mode === 'transit' && cached.transitSteps?.length) {
            steps = cached.transitSteps.map((ts) => ({
              mode: ts.type === 'WALKING' ? 'walk' : 'transit',
              arrowLabel: ts.type === 'WALKING' ? '도보' : ts.type === 'SUBWAY' ? '지하철' : '버스',
              minutes: ts.minutes ?? 0,
              distanceKm: ts.distanceKm ?? 0,
              nodeLabel: ts.type === 'WALKING' ? ts.toName || ts.fromName : ts.vehicleName,
            }));
          } else {
            steps = [
              {
                mode,
                arrowLabel: mode,
                minutes: cached.minutes,
                distanceKm: cached.distanceKm,
                nodeLabel: null,
              },
            ];
          }
        } else if (cached && 'failed' in cached) {
          status = 'failed';
          errorMsg = cached.errorMsg;
          steps = [{ mode, arrowLabel: mode, minutes: 0, distanceKm: 0, nodeLabel: null }];
        } else if (hasRealCoords) {
          status = 'unsearched';
          steps = [{ mode, arrowLabel: mode, minutes: 0, distanceKm: 0, nodeLabel: null }];
        } else {
          const pairKey = fromP && toP ? Number(fromP.id) * 131 + Number(toP.id) * 17 : idx;
          const dist = SEGMENT_DISTANCES[Math.abs(pairKey) % SEGMENT_DISTANCES.length];
          steps = computeMockSteps(mode, dist, idx);
        }

        const totalMinutes = steps.reduce((s, st) => s + st.minutes, 0);
        const totalDistanceKm = steps.reduce((s, st) => s + st.distanceKm, 0);
        const hasMultiStep = steps.length > 1;
        const expanded =
          mode === 'transit' && hasMultiStep
            ? expandedSegments[idx] !== false
            : Boolean(expandedSegments[idx]);

        return {
          mode,
          totalMinutes,
          totalDistanceKm,
          transfers: cached && !('failed' in cached) ? cached.transfers : null,
          status,
          errorMsg,
          steps,
          expanded,
        };
      }),
    [segments, places, getSegmentRouteCache, expandedSegments],
  );

  /** 방문지 순번 배지(지도 핀/목록 모두)는 전체 순번이 아니라 일차별로 1부터 다시 매긴다. */
  const dayOrderByPlaceId = useMemo(() => {
    const dayCounters = new Map<number, number>();
    const orderByPlaceId = new Map<number, number>();
    places.forEach((p) => {
      const day = p.day ?? 0;
      const next = (dayCounters.get(day) ?? 0) + 1;
      dayCounters.set(day, next);
      orderByPlaceId.set(p.id, next);
    });
    return orderByPlaceId;
  }, [places]);

  const timeline = useMemo(() => {
    const items: (
      | { kind: 'divider'; dayLabel: string }
      | { kind: 'place'; place: Place; index: number }
      | { kind: 'segment'; index: number }
    )[] = [];
    let lastDay = -1;
    places.forEach((p, i) => {
      const day = Math.min(p.day ?? 0, dayCount - 1);
      if (hasDayTabs && selectedDay !== null && day !== selectedDay) return;
      if (dayCount > 1 && day !== lastDay) {
        items.push({ kind: 'divider', dayLabel: `${day + 1}일차` });
        lastDay = day;
      }
      items.push({ kind: 'place', place: p, index: i });
      // 특정 일차만 보고 있을 때는, 다음 방문지가 다른 일차로 넘어가는 구간(그 일차의 마지막
      // 방문지 뒤에 붙는 연결선)은 보여주지 않는다 — 화면엔 그 다음 방문지가 안 보이는데
      // 구간만 매달려 나오는 문제가 있었다.
      const nextPlace = places[i + 1];
      const nextDay = nextPlace ? Math.min(nextPlace.day ?? 0, dayCount - 1) : null;
      const segmentInView =
        selectedDay === null || (day === selectedDay && nextDay === selectedDay);
      if (i < enrichedSegments.length && segmentInView) {
        items.push({ kind: 'segment', index: i });
      }
    });
    return items;
  }, [places, dayCount, hasDayTabs, selectedDay, enrichedSegments.length]);

  const totalDistance = enrichedSegments.reduce((sum, s) => sum + s.totalDistanceKm, 0);
  const totalMinutes = enrichedSegments.reduce((sum, s) => sum + s.totalMinutes, 0);
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);

  const shellClass = panelCollapsed
    ? `${styles.shell} ${styles.shellPanelCollapsed}`
    : mapCollapsed
      ? `${styles.shell} ${styles.shellMapCollapsed}`
      : styles.shell;

  const kakaoDirectionsUrl = (idx: number, p: Place): string | null => {
    const prev = places[idx - 1];
    if (!prev || prev.x == null || prev.y == null || p.x == null || p.y == null) return null;
    const cached = getSegmentRouteCache(idx - 1, segments[idx - 1]);
    if (cached && !('failed' in cached) && cached.landingURL) return cached.landingURL;
    const sName = encodeURIComponent(prev.name || '출발지');
    const eName = encodeURIComponent(p.name || '도착지');
    return `https://map.kakao.com/link/from/${sName},${prev.y},${prev.x}/to/${eName},${p.y},${p.x}`;
  };

  // ---- 변수(상황 변경 값 또는 자유 텍스트) → Gemini 에 보낼 형태 ----
  const currentVariableInput = useCallback((): RouteVariableInput | null => {
    const freeText = situationFreeText.trim();
    if (freeText) {
      return { id: 'freeText', label: '자유 설명', freeText };
    }
    if (!situationVar || !situationSeverity) return null;
    if (situationVar === 'weather' && !situationSub) return null;
    const varMeta = SITUATION_VARS.find((v) => v.id === situationVar);
    const sevMeta = SEVERITY_LEVELS.find((s) => s.id === situationSeverity);
    if (!varMeta || !sevMeta) return null;
    const subMeta =
      situationVar === 'weather' ? WEATHER_SUBS.find((w) => w.id === situationSub) : null;
    return {
      id: varMeta.id,
      label: varMeta.label,
      sub: subMeta ? { id: subMeta.id, label: subMeta.label } : null,
      severity: { id: sevMeta.id, label: sevMeta.label, weight: sevMeta.weight },
    };
  }, [situationFreeText, situationVar, situationSub, situationSeverity]);

  const currentVariableKey = useCallback((): string => {
    const v = currentVariableInput();
    if (!v) return 'none';
    if (v.freeText) return `free:${v.freeText}`;
    return `${v.id}|${v.sub?.id ?? ''}|${v.severity?.id ?? ''}`;
  }, [currentVariableInput]);

  // ---- AI 가중치 기반 최적경로 계산 ----
  /**
   * result.placeIds 순서대로 방문지를 재배치한다. 다른 일차 방문지는 배열에서 차지하던
   * 자리 그대로 두고, scopeIds 에 속한 자리에만 새 순서를 채워 넣는다 — 그래야 일차 경계를
   * 넘어 뒤섞이지 않는다(일차별 방문지 번호/타임라인 구분과도 맞물려 있다).
   */
  /**
   * scope 에 속한 자리들에 새 순서를 하나씩 흩뿌려 채우면, 그 자리들 중 배열 앞쪽에
   * 남아있던 이전 출발지(혹은 좌표 없는 방문지)가 여전히 "1번" 자리를 차지해버릴 수 있다.
   * 그래서 scope 블록 전체를 새 순서(orderedScoped, 0번째가 항상 새 출발지)로 통째로
   * 교체해서, 새 출발지가 항상 그 일차의 맨 앞(1번)에 오고 번호가 겹치지 않게 한다.
   */
  // 일차별로 순서대로(runMultiDayOptimalRoute) 또는 여러 일차 결과를 한 번에 다시 적용할 때
  // (setCriteria) applyOptimizedOrder가 연달아 여러 번 불릴 수 있다. 그때마다 넘겨받은
  // sourcePlaces(클로저에 고정된 값)를 기준으로 계산하면, 뒤에 처리되는 일차가 앞서 반영된
  // 일차의 변경을 덮어써 버린다. 그래서 항상 setPlaces의 최신 상태(prev)를 기준으로 계산한다.
  const applyOptimizedOrder = useCallback((result: OptimalRouteResult, scopeIds: Set<number>) => {
    let nextPlaces: Place[] = [];
    setPlaces((prevPlaces) => {
      const byId = new Map(prevPlaces.map((p) => [p.id, p] as const));
      const orderedScoped = result.placeIds
        .map((id) => byId.get(id))
        .filter((p): p is Place => Boolean(p));

      let blockInserted = false;
      const next: Place[] = [];
      prevPlaces.forEach((p) => {
        if (!scopeIds.has(p.id)) {
          next.push(p);
          return;
        }
        if (!blockInserted) {
          blockInserted = true;
          next.push(...orderedScoped);
        }
        // scope 에 속한 나머지 자리는 이미 orderedScoped 블록에 포함돼 있으므로 건너뛴다.
      });
      nextPlaces = next;
      return next;
    });
    setSegments((prevSegments) => resizeSegments(nextPlaces, prevSegments));
    setRouteSegmentsReady(false);
  }, []);

  const runOptimalRoute = useCallback(
    async (origin: number) => {
      const originPlace = places.find((p) => p.id === origin);
      if (!originPlace) return;
      if (originPlace.x == null || originPlace.y == null) {
        showToast('출발지의 좌표 정보가 없어 경로를 계산할 수 없어요');
        return;
      }

      // 경로 계산은 출발지와 같은 일차의 방문지끼리만 이뤄진다 — 다른 일차는 완전히 별개 영역이다.
      const originDay = originPlace.day ?? 0;
      const dayPlaces = hasDayTabs ? places.filter((p) => (p.day ?? 0) === originDay) : places;

      const variableKey = currentVariableKey();
      const signature = buildRouteSignature(origin, dayPlaces, variableKey);
      const existingForDay = routeOptimizationByDay[originDay];
      const reusable = existingForDay && existingForDay.signature === signature ? existingForDay : null;

      setLoading(true);
      try {
        let stateToApply: RouteOptimizationState;

        if (reusable) {
          stateToApply = reusable;
          logActivity('저장된 최적 경로 결과를 사용했습니다');
        } else {
          const others = dayPlaces.filter((p) => p.id !== origin && p.x != null && p.y != null);
          const nodes = [originPlace, ...others];

          if (nodes.length < 2) {
            const trivial: OptimalRouteResult = {
              placeIds: nodes.map((p) => p.id),
              totalDistanceKm: 0,
              totalMinutes: 0,
            };
            const fallbackWeights = { metricWeight: 1, comfortWeight: 0 };
            stateToApply = {
              signature,
              originId: origin,
              weights: fallbackWeights,
              distance: trivial,
              time: trivial,
            };
          } else {
            const fetchLeg = async (a: Place, b: Place, crit: RouteCriteria): Promise<RouteLeg> => {
              const key = `car_${a.id}_${b.id}_${crit}`;
              const existing = routeCache[key];
              if (existing && !('failed' in existing)) return existing;
              try {
                const leg = await fetchRouteLeg('car', {
                  originX: a.x as number,
                  originY: a.y as number,
                  destX: b.x as number,
                  destY: b.y as number,
                  priority: crit,
                });
                setRouteCache((prev) => ({ ...prev, [key]: leg }));
                return leg;
              } catch (err) {
                console.error('optimal route leg fetch failed:', err);
                const distanceKm = haversineKm(
                  { x: a.x as number, y: a.y as number },
                  { x: b.x as number, y: b.y as number },
                );
                const fallback: RouteLeg = {
                  distanceKm,
                  minutes: Math.round(distanceKm * MODE_MAP.car.minPerKm),
                  transfers: null,
                  pathPoints: [],
                };
                setRouteCache((prev) => ({ ...prev, [key]: fallback }));
                return fallback;
              }
            };

            const buildLegMatrix = async (crit: RouteCriteria) => {
              const size = nodes.length;
              const matrix: (RouteLeg | null)[][] = Array.from({ length: size }, () =>
                new Array(size).fill(null),
              );
              const tasks: (() => Promise<void>)[] = [];
              for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                  if (i === j) continue;
                  tasks.push(() =>
                    fetchLeg(nodes[i], nodes[j], crit).then((leg) => {
                      matrix[i][j] = leg;
                    }),
                  );
                }
              }
              // 방문지 수의 제곱만큼 요청이 한 번에 몰리면 카카오 API 요청 속도 제한에 걸린다 —
              // 동시 요청 수를 제한해서 실패율을 낮춘다.
              await runWithConcurrencyLimit(tasks, 4);
              return matrix;
            };

            const toCost = (legMatrix: (RouteLeg | null)[][], field: 'distanceKm' | 'minutes') =>
              legMatrix.map((row) => row.map((leg) => leg?.[field] ?? 0));

            // 지도 API 실측 데이터(car 경로)와 Gemini 가중치를 동시에 가져온다 — 서로 독립적이라 병렬 호출.
            const [weights, distLegs, timeLegs] = await Promise.all([
              fetchRouteWeights(currentVariableInput(), criteria),
              buildLegMatrix('distance'),
              buildLegMatrix('time'),
            ]);

            const distCost = toCost(distLegs, 'distanceKm');
            const timeCost = toCost(timeLegs, 'minutes');
            const delayCost = nodes.map((p) => computeDelayCost(p));
            const distOrderIdx = solveWeightedOpenPathOrder(
              distCost,
              delayCost,
              weights.metricWeight,
              weights.comfortWeight,
            );
            const timeOrderIdx = solveWeightedOpenPathOrder(
              timeCost,
              delayCost,
              weights.metricWeight,
              weights.comfortWeight,
            );

            const distanceResult: OptimalRouteResult = {
              placeIds: distOrderIdx.map((i) => nodes[i].id),
              totalDistanceKm: sumPathCost(distOrderIdx, distCost),
              totalMinutes: sumPathCost(distOrderIdx, toCost(distLegs, 'minutes')),
            };
            const timeResult: OptimalRouteResult = {
              placeIds: timeOrderIdx.map((i) => nodes[i].id),
              totalMinutes: sumPathCost(timeOrderIdx, timeCost),
              totalDistanceKm: sumPathCost(timeOrderIdx, toCost(timeLegs, 'distanceKm')),
            };

            stateToApply = {
              signature,
              originId: origin,
              weights,
              distance: distanceResult,
              time: timeResult,
            };
          }
          setRouteOptimizationByDay((prev) => ({ ...prev, [originDay]: stateToApply }));
          logActivity('AI가 변수를 반영해 최적 경로를 계산했습니다');
        }

        const scopeIds = new Set(stateToApply.distance.placeIds);
        applyOptimizedOrder(criteria === 'distance' ? stateToApply.distance : stateToApply.time, scopeIds);
        await searchAllRoutes();
        // 경로 계산이 끝났으므로 이동수단을 다시 표시한다.
        setRouteSegmentsReady(true);
        showToast(reusable ? '이전 계산 결과를 사용했어요' : '최적 경로 계산이 완료됐어요');
      } catch (err) {
        console.error('runOptimalRoute failed:', err);
        showToast('최적 경로 계산 중 오류가 발생했어요');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- routeCache/searchAllRoutes 는 최신 값을 함수 내부에서 직접 읽는다
    [
      places,
      routeOptimizationByDay,
      criteria,
      applyOptimizedOrder,
      showToast,
      logActivity,
      currentVariableKey,
      currentVariableInput,
    ],
  );

  const proceedAfterOrigin = (origin: number) => {
    if (!currentVariableInput()) {
      setPendingRouteOrigin(origin);
      setNoVariableModalOpen(true);
      return;
    }
    void runOptimalRoute(origin);
  };

  const setCriteria = (c: RouteCriteria) => {
    setCriteriaState(c);
    // 이미 계산해 둔 일차가 있다면(출발지/방문지/변수가 그대로인 일차만) 다시 계산하지 않고
    // 저장해 둔 최단거리/최단시간 결과 중 해당하는 쪽을 그대로 적용한다 — 전체보기에서
    // 여러 일차를 각각 계산해 뒀다면 그 일차들 전부에 적용된다.
    const variableKey = currentVariableKey();
    let anyApplied = false;
    Object.entries(routeOptimizationByDay).forEach(([dayStr, opt]) => {
      const day = Number(dayStr);
      const dayPlaces = hasDayTabs ? places.filter((p) => (p.day ?? 0) === day) : places;
      const signature = buildRouteSignature(opt.originId, dayPlaces, variableKey);
      if (opt.signature !== signature) return;
      const scopeIds = new Set(opt.distance.placeIds);
      applyOptimizedOrder(c === 'distance' ? opt.distance : opt.time, scopeIds);
      anyApplied = true;
    });
    for (let idx = 0; idx < segments.length; idx++) {
      for (const mode of MODE_ORDER) fetchSegmentRouteForModeWithCriteria(idx, mode, c);
    }
    if (anyApplied) setRouteSegmentsReady(true);
  };

  // 일차별로 경로를 따로 계산한다. 특정 일차를 보고 있으면 그 일차 방문지 중에서만 출발지를
  // 고르고, 전체보기에서는 모든 일차의 방문지를 다 보여주되(각 항목에 일차를 표시) 어떤
  // 일차를 골라도 그 일차의 경로만 계산되도록 한다(runOptimalRoute가 출발지의 day로 범위를
  // 좁혀서 계산한다).
  const originCandidatePlaces =
    hasDayTabs && selectedDay !== null
      ? places.filter((p) => (p.day ?? 0) === selectedDay)
      : places;

  const handleRouteCalcClick = () => {
    if (loading || originCandidatePlaces.length === 0) return;
    // 전체보기 + 2일 이상이면 일차마다 따로 누르지 않도록, 일차별 출발지를 한 번에 고른다.
    if (isAllDaysView && dayCount > 1) {
      const defaults: Record<number, number> = {};
      for (let day = 0; day < dayCount; day++) {
        const dayPlaces = places.filter((p) => (p.day ?? 0) === day);
        if (!dayPlaces.length) continue;
        defaults[day] =
          originId != null && dayPlaces.some((p) => p.id === originId)
            ? originId
            : dayPlaces[0].id;
      }
      setMultiDayOriginChoices(defaults);
      setMultiDayOriginModalOpen(true);
      return;
    }
    if (originCandidatePlaces.length === 1) {
      setOriginId(originCandidatePlaces[0].id);
      proceedAfterOrigin(originCandidatePlaces[0].id);
      return;
    }
    const defaultChoice =
      originId != null && originCandidatePlaces.some((p) => p.id === originId)
        ? originId
        : originCandidatePlaces[0].id;
    setOriginChoiceId(defaultChoice);
    setOriginListExpanded(false);
    setOriginSelectOpen(true);
  };

  /** 일차별 출발지를 다 고른 뒤 확인하면, 일차 순서대로 하나씩 최적 경로를 계산한다. */
  const runMultiDayOptimalRoute = async () => {
    const entries = Object.entries(multiDayOriginChoices)
      .map(([day, id]) => [Number(day), id] as const)
      .sort((a, b) => a[0] - b[0]);
    if (!entries.length) return;
    setMultiDayOriginModalOpen(false);
    setMultiDayRunning(true);
    try {
      // 일차 순서대로 하나씩 끝내야 places 상태가 꼬이지 않는다 (동시에 돌리지 않음).
      for (const [, originIdForDay] of entries) {
        await runOptimalRoute(originIdForDay);
      }
      const lastOriginId = entries[entries.length - 1][1];
      setOriginId(lastOriginId);
      logActivity(`전체 ${entries.length}개 일차의 경로를 한 번에 계산했습니다`);
      showToast(`${entries.length}개 일차 경로를 모두 계산했어요`);
    } finally {
      setMultiDayRunning(false);
    }
  };

  const confirmOriginChoice = () => {
    if (originChoiceId == null) return;
    setOriginSelectOpen(false);
    setOriginConfirmOpen(true);
  };

  const finalizeOrigin = () => {
    if (originChoiceId == null) return;
    const chosenId = originChoiceId;
    setOriginConfirmOpen(false);
    // 출발지를 바꾸면 그 일차에 저장해 둔 최적 경로 결과는 더 이상 유효하지 않다 —
    // 시그니처 비교로도 걸러지지만, 이전 출발지가 1번으로 남아있는 일이 없도록 명시적으로 비운다.
    if (chosenId !== originId) {
      const chosenPlace = places.find((p) => p.id === chosenId);
      const chosenDay = chosenPlace?.day ?? 0;
      setRouteOptimizationByDay((prev) => {
        if (!(chosenDay in prev)) return prev;
        const next = { ...prev };
        delete next[chosenDay];
        return next;
      });
    }
    setOriginId(chosenId);
    proceedAfterOrigin(chosenId);
  };

  return (
    <div className={shellClass}>
      {/* 좌측 패널 */}
      <div className={styles.panel}>
        {panelCollapsed ? (
          <button
            type="button"
            className={styles.rail}
            onClick={togglePanelCollapsed}
            aria-label="플래너 펼치기"
          >
            »
          </button>
        ) : (
          <>
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderTop}>
                <Link href="/" className={styles.panelLogo} onClick={(e) => guardLeave('/', e)}>
                  p<span className={styles.panelLogoColon}>:</span>nder
                </Link>
                <div className={styles.panelHeaderActions}>
                  <ThemeToggle />
                  {canManageInvite ? (
                    <button
                      type="button"
                      className={styles.chipBtn}
                      onClick={() => setPermissionsModalOpen(true)}
                    >
                      권한 관리
                    </button>
                  ) : null}
                  {canManageInvite ? (
                    <button
                      type="button"
                      className={styles.chipBtn}
                      onClick={() => setInviteOpen((v) => !v)}
                    >
                      + 일행 초대
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.collapseBtn}
                    onClick={togglePanelCollapsed}
                    title="플래너 접기"
                  >
                    «
                  </button>
                </div>
              </div>

              {inviteOpen ? (
                <div className={styles.inviteBox}>
                  <p className={styles.inviteDesc}>
                    편집 가능 링크는 함께 수정, 보기 전용 링크는 보기만 할 수 있어요
                  </p>

                  <p className={styles.inviteRoleLabel}>편집 가능</p>
                  <div className={styles.inviteLinkRow}>
                    <span className={styles.inviteLink}>
                      {editorInviteLink || '링크를 만드는 중...'}
                    </span>
                    <button
                      type="button"
                      className={styles.inviteCopyBtn}
                      onClick={() => copyInviteLink('editor', editorInviteLink)}
                    >
                      {editorCopyLabel}
                    </button>
                  </div>

                  <p className={styles.inviteRoleLabel}>보기 전용</p>
                  <div className={styles.inviteLinkRow}>
                    <span className={styles.inviteLink}>
                      {viewerInviteLink || '링크를 만드는 중...'}
                    </span>
                    <button
                      type="button"
                      className={styles.inviteCopyBtn}
                      onClick={() => copyInviteLink('viewer', viewerInviteLink)}
                    >
                      {viewerCopyLabel}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 조건 설정 */}
            <div className={styles.criteriaSection}>
              <p className={styles.sectionLabel}>경로 기준</p>
              <div className={styles.segmentedGroup}>
                {(['time', 'distance'] as RouteCriteria[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={
                      criteria === c
                        ? `${styles.segmentedItem} ${styles.segmentedItemActive}`
                        : styles.segmentedItem
                    }
                    onClick={() => setCriteria(c)}
                  >
                    {CRITERIA_LABEL[c]}
                  </button>
                ))}
              </div>

              <p className={styles.sectionLabel} style={{ marginTop: 12 }}>
                전체 구간 일괄 적용
              </p>
              <div className={styles.modeChipRow}>
                {MODE_ORDER.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`${styles.modeApplyChip} ${styles[`segmentChip-${mode}`]}`}
                    style={{ opacity: lastAppliedMode && lastAppliedMode !== mode ? 0.45 : 1 }}
                    onClick={() => applyModeToAll(mode)}
                  >
                    <ModeIcon mode={mode} />
                    {mode === 'car'
                      ? '자동차'
                      : mode === 'walk'
                        ? '도보'
                        : mode === 'transit'
                          ? '대중교통'
                          : '자전거'}
                  </button>
                ))}
              </div>
            </div>

            {/* 방문지 목록 헤더 */}
            <div className={styles.listHeader}>
              <div className={styles.listHeaderLeft}>
                <span className={styles.listTitle}>
                  방문지 목록 {places.length > 0 ? `(${places.length})` : ''}
                </span>
                {hasDayTabs ? (
                  <select
                    value={selectedDay === null ? 'all' : String(selectedDay)}
                    onChange={(e) =>
                      setSelectedDay(e.target.value === 'all' ? null : Number(e.target.value))
                    }
                    className={styles.daySelect}
                  >
                    <option value="all">전체보기</option>
                    {dayTabs.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
              <div className={styles.listHeaderRight}>
                {canEdit ? (
                  <span className={styles.hint}>
                    {isAllDaysView ? '드래그로 같은 일차 안에서 순서 변경' : '드래그로 순서 변경'}
                  </span>
                ) : null}
                {places.length > 0 && canEdit ? (
                  <button type="button" className={styles.clearAllBtn} onClick={clearAllPlaces}>
                    전체 삭제
                  </button>
                ) : null}
              </div>
            </div>

            {places.length === 0 ? (
              <div className={styles.emptyState}>
                {canEdit ? (
                  <button
                    type="button"
                    className={styles.emptyAddBtn}
                    onClick={openSearchMode}
                    disabled={isAllDaysView}
                  >
                    ＋
                  </button>
                ) : null}
                <p className={styles.emptyTitle}>아직 방문지가 없어요</p>
                {canEdit ? (
                  <p className={styles.emptyDesc}>
                    주소를 추가하면
                    <br />
                    최적 방문 순서를 자동으로 만들어드려요
                  </p>
                ) : null}
              </div>
            ) : (
              <div className={styles.timeline}>
                {timeline.map((item, i) => {
                  if (item.kind === 'divider') {
                    return (
                      <div key={`divider-${i}`} className={styles.dayDivider}>
                        <span>{item.dayLabel}</span>
                        <span className={styles.dayDividerLine} />
                      </div>
                    );
                  }
                  if (item.kind === 'place') {
                    return (
                      <PlaceCard
                        key={item.place.id}
                        place={item.place}
                        order={item.index + 1}
                        displayOrder={dayOrderByPlaceId.get(item.place.id) ?? item.index + 1}
                        isLast={item.index === places.length - 1}
                        isDragging={dragIndex === item.index}
                        expanded={Boolean(expandedPlaces[item.place.id])}
                        memoSaved={Boolean(savedMemoIds[item.place.id])}
                        canEdit={canEdit}
                        canReorder
                        handlers={{
                          onDragStart,
                          onDragOver,
                          onDrop,
                          onDragEnd,
                          onToggleExpand: togglePlaceExpand,
                          onDeleteClick: onDeleteClick,
                          onOpenEdit: openEditModal,
                          onOpenCategory: openCategoryModal,
                          onPackItemsChange: updatePackItems,
                          onSaveMemo: saveMemo,
                          onDurationChange: changeDuration,
                        }}
                      />
                    );
                  }
                  // 경로가 재계산되기 전까지는 이동수단(구간)을 숨겨서, 방문지 순서가 바뀌었는데도
                  // 예전 구간 정보가 잘못 매칭되어 보이는 문제를 막는다.
                  if (!routeSegmentsReady) return null;
                  const seg = enrichedSegments[item.index];
                  if (!seg) return null;
                  return (
                    <SegmentConnector
                      key={`segment-${i}`}
                      mode={seg.mode}
                      totalMinutes={seg.totalMinutes}
                      totalDistanceKm={seg.totalDistanceKm}
                      transfers={seg.transfers}
                      status={seg.status}
                      errorMsg={seg.errorMsg}
                      steps={seg.steps}
                      expanded={seg.expanded}
                      canEdit={canEdit}
                      directionsUrl={kakaoDirectionsUrl(item.index + 1, places[item.index + 1])}
                      onCycle={() => cycleSegmentMode(item.index)}
                      onToggleExpand={() => toggleSegmentExpand(item.index)}
                    />
                  );
                })}
              </div>
            )}

            {/* 주소 추가 */}
            <div className={styles.addBar}>
              <div className={styles.addBarRow}>
                {canEdit ? (
                  <>
                    <input
                      value={newAddress}
                      onChange={(e) => {
                        setNewAddress(e.target.value);
                        setMapSearchQuery(e.target.value);
                        setPendingSelectedDoc(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (isAllDaysView) return;
                          openSearchMode();
                          runMapSearch();
                        }
                      }}
                      onFocus={() => {
                        if (isAllDaysView) return;
                        openSearchMode();
                      }}
                      placeholder={
                        isAllDaysView
                          ? '전체보기에서는 추가할 수 없어요. 일차를 선택해주세요.'
                          : '주소를 검색하여 추가하기'
                      }
                      disabled={isAllDaysView}
                      className={styles.addInput}
                    />
                    <button
                      type="button"
                      className={styles.addBtn}
                      disabled={isAllDaysView}
                      onClick={() => {
                        if (isAllDaysView) return;
                        openSearchMode();
                        runMapSearch();
                      }}
                    >
                      검색
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 우측: 지도 + 요약 */}
      <div className={styles.mapCol}>
        {mapCollapsed ? (
          <button
            type="button"
            className={styles.rail}
            onClick={toggleMapCollapsed}
            aria-label="지도 펼치기"
          >
            «
          </button>
        ) : (
          <>
            <div className={styles.mapArea}>
              <div ref={mapRef} className={styles.mapCanvas} />

              {/* 지도 화면 → 방문지/주소 입력 화면으로 돌아가는 버튼. 지도 상단은 검색창(searchOverlay)이
                  펼침/접힘 상태에 따라 폭을 다르게 차지하므로, 그 영역과 절대 겹치지 않도록
                  mapArea 하단(요약바 위쪽)에 고정한다. */}
              {panelCollapsed ? (
                <button
                  type="button"
                  className={styles.mobileExpandPanelBtn}
                  onClick={togglePanelCollapsed}
                  aria-label="플래너 펼치기"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              ) : null}

              {searchMode ? (
                <div className={styles.searchOverlay}>
                  {mapSearchBarCollapsed ? (
                    <button
                      type="button"
                      className={styles.searchExpandBtn}
                      onClick={toggleMapSearchCollapsed}
                      title="펼치기"
                      aria-label="검색창 펼치기"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="rgba(23,23,25,.5)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transform: 'rotate(180deg)' }}
                      >
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                  ) : (
                    <>
                      <div className={styles.searchBox}>
                        <button
                          type="button"
                          className={styles.searchCollapseBtn}
                          onClick={toggleMapSearchCollapsed}
                          title="접기"
                          aria-label="검색창 접기"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 15l-6-6-6 6" />
                          </svg>
                        </button>
                        <input
                          value={mapSearchQuery}
                          onChange={(e) => setMapSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              runMapSearch();
                            }
                          }}
                          placeholder="장소명 또는 주소를 검색하세요"
                          autoFocus
                          className={styles.searchInput}
                        />
                        <button
                          type="button"
                          className={styles.searchCloseBtn}
                          onClick={clearMapSearchQuery}
                          aria-label="검색어 지우기"
                        >
                          ×
                        </button>
                        <button
                          type="button"
                          className={styles.searchRunBtn}
                          onClick={runMapSearch}
                          aria-label="검색"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#12321F"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <circle cx="11" cy="11" r="7" />
                            <path d="M21 21l-4.3-4.3" />
                          </svg>
                        </button>
                      </div>
                      {mapSearchLoading ? (
                        <div className={styles.searchStatusBox}>검색 중...</div>
                      ) : null}
                      {mapSearchError ? (
                        <div className={`${styles.searchStatusBox} ${styles.searchStatusError}`}>
                          {mapSearchError}
                        </div>
                      ) : null}
                      {mapSearchResults.length > 0 ? (
                        <div className={styles.searchResults}>
                          {mapSearchResults.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              className={styles.searchResultItem}
                              onClick={() => openAddConfirmForDoc(doc)}
                            >
                              <span className={styles.searchResultName}>{doc.place_name}</span>
                              <span className={styles.searchResultAddress}>
                                {doc.road_address_name || doc.address_name}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}

              {!kakaoReady ? (
                <div className={styles.mapStatusBadge}>
                  {kakaoLoadFailed
                    ? '지도 로드 실패 · 카드로 계속 진행하세요'
                    : '지도 불러오는 중...'}
                </div>
              ) : null}

              {loading ? (
                <div className={styles.mapLoadingOverlay}>
                  <div className={styles.spinner} />
                  <span>동선 재계산 중...</span>
                </div>
              ) : null}

              <div className={aiOpen ? `${styles.aiPanel} ${styles.aiPanelOpen}` : styles.aiPanel}>
                <div className={styles.aiHead}>
                  <div>
                    <p className={styles.aiTitle}>✨ 경로 AI</p>
                    <p className={styles.aiSubtitle}>경로 계획을 도와드릴게요</p>
                  </div>
                  <button
                    type="button"
                    className={styles.aiCloseBtn}
                    onClick={() => setAiOpen(false)}
                    aria-label="닫기"
                  >
                    ✕
                  </button>
                </div>
                <div className={styles.aiContextBar}>
                  현재 경로 ·{' '}
                  {places.length
                    ? `경유지 ${places.length}곳 · ${totalDistance.toFixed(1)}km · ${h > 0 ? h + '시간 ' : ''}${m}분`
                    : '방문지를 추가하면 AI가 경로를 참고해요'}
                </div>
                <div className={styles.aiMessages} ref={aiMessagesRef}>
                  {aiMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={styles.aiMessageWrap}
                      style={{ alignItems: msg.role === 'ai' ? 'flex-start' : 'flex-end' }}
                    >
                      <div className={msg.role === 'ai' ? styles.aiBubbleAi : styles.aiBubbleUser}>
                        {msg.text}
                      </div>
                      {msg.role === 'ai' &&
                      i === aiMessages.length - 1 &&
                      msg.suggestions?.length ? (
                        <div className={styles.aiSuggestions}>
                          {msg.suggestions.map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={styles.aiSuggestionChip}
                              onClick={() => sendAiMessage(s)}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {aiLoading ? (
                    <div className={styles.aiMessageWrap} style={{ alignItems: 'flex-start' }}>
                      <div className={`${styles.aiBubbleAi} ${styles.aiTypingBubble}`}>
                        <span className={styles.aiTypingDot} />
                        <span className={styles.aiTypingDot} />
                        <span className={styles.aiTypingDot} />
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className={styles.aiInputRow}>
                  <input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendAiMessage();
                    }}
                    placeholder="메시지를 입력하세요..."
                    className={styles.aiInput}
                  />
                  <button
                    type="button"
                    className={styles.aiSendBtn}
                    style={{ opacity: aiLoading ? 0.5 : 1 }}
                    onClick={() => sendAiMessage()}
                  >
                    {aiLoading ? '...' : '전송'}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.summaryBar}>
              <div className={styles.summaryStats}>
                <div>
                  <p className={styles.summaryLabel}>총 방문지</p>
                  <p className={styles.summaryValue}>{places.length}곳</p>
                </div>
                <div>
                  <p className={styles.summaryLabel}>총 이동거리</p>
                  <p className={styles.summaryValue}>
                    {places.length ? `${totalDistance.toFixed(1)}km` : '-'}
                  </p>
                </div>
                <div>
                  <p className={styles.summaryLabel}>총 이동시간</p>
                  <p className={styles.summaryValue}>
                    {places.length ? (h > 0 ? `${h}시간 ${m}분` : `${m}분`) : '-'}
                  </p>
                </div>
              </div>
              <div className={styles.summaryActions}>
                {canEdit && scheduleId ? (
                  <button
                    type="button"
                    className={styles.dateEditIconBtn}
                    onClick={openDateEditModal}
                    title="날짜 변경"
                    aria-label="일정 날짜 변경"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- 정적 16px 아이콘, next/image 최적화 불필요 */}
                    <img src="/icons/calendar-days.png" alt="" className={styles.dateEditIcon} />
                  </button>
                ) : null}
                {canDeleteOriginal ? (
                  <button
                    type="button"
                    className={styles.deleteOriginalBtn}
                    onClick={deleteOriginalRoute}
                  >
                    원본 삭제
                  </button>
                ) : null}
                {canEdit ? (
                  <button
                    type="button"
                    className={styles.situationBtn}
                    onClick={() => {
                      if (isAllDaysView && dayCount > 1) {
                        setVariableDayPickerOpen(true);
                        return;
                      }
                      openSituationModal();
                    }}
                  >
                    변수 추가
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => setActivityLogOpen(true)}
                >
                  활동 로그
                </button>
                <button type="button" className={styles.actionBtn} onClick={saveOrRemoveAction}>
                  {isViewerRole && isLoggedIn ? '내 일정에서 제거' : saveLabel}
                </button>
                {role === 'viewer' && !myEditRequestPending ? (
                  <button
                    type="button"
                    className={styles.requestEditBtn}
                    onClick={requestEditPermission}
                  >
                    편집 권한 요청
                  </button>
                ) : null}
                {role === 'viewer' && myEditRequestPending ? (
                  <span className={styles.pendingChip}>● 승인 대기 중</span>
                ) : null}
                {canEdit ? (
                  <Button
                    size="md"
                    onClick={handleRouteCalcClick}
                    disabled={loading || multiDayRunning}
                  >
                    경로 계산
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI FAB */}
      {!aiOpen ? (
        <button type="button" className={styles.aiFab} onClick={() => setAiOpen(true)}>
          ✨ AI 도우미
        </button>
      ) : null}

      {/* 토스트 */}
      <div className={styles.toast} style={{ opacity: toastVisible ? 1 : 0 }}>
        ✓ {toastMsg}
      </div>

      {/* 활동 로그 드로어 */}
      {activityLogOpen ? (
        <div className={styles.drawerOverlay} onClick={() => setActivityLogOpen(false)} />
      ) : null}
      <div
        className={styles.activityDrawer}
        style={{ transform: activityLogOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className={styles.drawerHead}>
          <span>활동 로그</span>
          <button
            type="button"
            className={styles.drawerCloseBtn}
            onClick={() => setActivityLogOpen(false)}
          >
            ✕
          </button>
        </div>
        <div className={styles.nicknameRow}>
          <span>닉네임</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={styles.nicknameInput}
          />
        </div>
        <div className={styles.drawerBody}>
          {activityLog.length > 0 ? (
            activityLog.map((log) => (
              <div key={log.id} className={styles.activityItem}>
                <p className={styles.activityText}>{log.text}</p>
                <p className={styles.activityTime}>{log.time}</p>
              </div>
            ))
          ) : (
            <p className={styles.drawerEmpty}>아직 활동 내역이 없어요</p>
          )}
        </div>
      </div>

      {/* 새 일정 날짜 모달 */}
      <Modal
        open={newTripDateModalOpen}
        title="새 일정 만들기"
        onClose={() => setNewTripDateModalOpen(false)}
      >
        <p className={styles.modalDesc}>여행 날짜를 입력해주세요</p>
        <div className={styles.dateFieldGroup}>
          <label className={styles.dateField}>
            <span>시작 날짜</span>
            <input
              type="date"
              value={tripStart}
              onChange={(e) => {
                setTripStart(e.target.value);
                if (tripEnd < e.target.value) setTripEnd(e.target.value);
              }}
              autoFocus
            />
          </label>
          <label className={styles.dateField}>
            <span>종료 날짜</span>
            <input
              type="date"
              value={tripEnd}
              min={tripStart}
              onChange={(e) => setTripEnd(e.target.value)}
            />
          </label>
        </div>
        <div className={styles.modalActionsEnd}>
          <Button
            size="sm"
            onClick={() => {
              setNewTripDateModalOpen(false);
              // 날짜만 고른 초기 설정 단계라, 아직 "저장 안 된 변경사항"으로 치지 않는다.
              markClean();
            }}
          >
            시작하기
          </Button>
        </div>
      </Modal>

      {/* 일정 날짜 변경 모달 */}
      <Modal
        open={dateEditModalOpen}
        title="일정 날짜 변경"
        onClose={() => setDateEditModalOpen(false)}
      >
        <p className={styles.modalDesc}>변경할 여행 날짜를 선택해주세요</p>
        <div className={styles.dateFieldGroup}>
          <label className={styles.dateField}>
            <span>시작 날짜</span>
            <input
              type="date"
              value={draftTripStart}
              onChange={(e) => {
                setDraftTripStart(e.target.value);
                if (draftTripEnd < e.target.value) setDraftTripEnd(e.target.value);
              }}
              autoFocus
            />
          </label>
          <label className={styles.dateField}>
            <span>종료 날짜</span>
            <input
              type="date"
              value={draftTripEnd}
              min={draftTripStart}
              onChange={(e) => setDraftTripEnd(e.target.value)}
            />
          </label>
        </div>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setDateEditModalOpen(false)}>
            취소
          </Button>
          <Button size="sm" onClick={confirmDateEdit}>
            확인
          </Button>
        </div>
      </Modal>

      {/* 권한 관리 모달 */}
      <Modal
        open={permissionsModalOpen}
        title="권한 관리"
        onClose={() => setPermissionsModalOpen(false)}
      >
        <p className={styles.modalSectionLabel}>현재 편집 가능한 일행</p>
        <div className={styles.memberList}>
          {members
            .filter((m) => m.role === 'editor')
            .map((m) => (
              <div key={m.id} className={styles.memberRow}>
                {m.nickname}님
              </div>
            ))}
        </div>
        {editRequests.length > 0 ? (
          <>
            <p className={styles.modalSectionLabel} style={{ marginTop: 14 }}>
              편집 권한 요청
            </p>
            <div className={styles.memberList}>
              {editRequests.map((req) => (
                <div key={req.id} className={styles.requestRow}>
                  <span>{req.nickname}님</span>
                  <div className={styles.requestActions}>
                    <button
                      type="button"
                      className={styles.approveBtn}
                      onClick={() => askApproveRequest(req.id)}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      className={styles.rejectBtn}
                      onClick={() => askRejectRequest(req.id)}
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </Modal>

      {/* 승인/거절 확인 */}
      <Modal open={requestConfirmOpen} title="확인" onClose={() => setRequestConfirmOpen(false)}>
        <p className={styles.modalDesc}>
          {(() => {
            const target = editRequests.find((r) => r.id === requestConfirmId);
            const name = target?.nickname ?? '';
            return requestConfirmKind === 'approve'
              ? `${name}님의 편집 권한을 수락하시겠습니까?`
              : `${name}님의 편집 권한을 거절하시겠습니까?`;
          })()}
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setRequestConfirmOpen(false)}>
            취소
          </Button>
          <Button
            variant={requestConfirmKind === 'reject' ? 'danger' : 'primary'}
            size="sm"
            onClick={confirmRequestAction}
          >
            {requestConfirmKind === 'approve' ? '수락' : '거절'}
          </Button>
        </div>
      </Modal>

      {/* 방문지 수정 */}
      <Modal open={editModalOpen} title="방문지 수정" onClose={() => setEditModalOpen(false)}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>이름</span>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className={styles.fieldInput}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>주소</span>
          <input
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
            className={styles.fieldInput}
          />
        </div>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(false)}>
            취소
          </Button>
          <Button size="sm" onClick={saveEditModal}>
            저장
          </Button>
        </div>
      </Modal>

      {/* 카테고리 선택 */}
      <Modal
        open={categoryModalOpen}
        title="카테고리 선택"
        onClose={() => setCategoryModalOpen(false)}
      >
        <div className={styles.categoryGrid}>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              type="button"
              className={styles.categoryOption}
              onClick={() => selectCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </Modal>

      {/* 방문지 추가 확인 */}
      <Modal open={addConfirmOpen} title="방문지를 추가할까요?" onClose={cancelAddConfirm}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>장소명</span>
          <input
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            className={styles.fieldInput}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>도로명주소</span>
          <p className={styles.fieldStatic}>{pendingAddress}</p>
        </div>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={cancelAddConfirm}>
            취소
          </Button>
          <Button size="sm" onClick={confirmAddPlace} disabled={!pendingName.trim()}>
            추가
          </Button>
        </div>
      </Modal>

      {/* 방문지 추가 (출발지 선택 팝업에서 "출발지가 방문지 목록에 없어요"로 진입) */}
      <Modal open={addPlaceModalOpen} title="방문지 추가" onClose={cancelAddPlaceModal}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={mapSearchQuery}
            onChange={(e) => setMapSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runMapSearch();
              }
            }}
            placeholder="주소 또는 장소명을 입력하세요"
            autoFocus
            className={styles.addInput}
          />
          <Button size="sm" onClick={runMapSearch}>
            검색
          </Button>
        </div>
        {mapSearchLoading ? <p className={styles.modalDesc}>검색 중...</p> : null}
        {mapSearchError ? <p className={styles.modalDesc}>{mapSearchError}</p> : null}
        {mapSearchResults.length > 0 ? (
          <div
            className={styles.searchResults}
            style={{ marginTop: 8, maxHeight: 260, overflowY: 'auto' }}
          >
            {mapSearchResults.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className={styles.searchResultItem}
                onClick={() => {
                  setAddPlaceModalOpen(false);
                  openAddConfirmForDoc(doc);
                }}
              >
                <span className={styles.searchResultName}>{doc.place_name}</span>
                <span className={styles.searchResultAddress}>
                  {doc.road_address_name || doc.address_name}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div className={styles.modalActions} style={{ marginTop: 16 }}>
          <Button variant="secondary" size="sm" onClick={cancelAddPlaceModal}>
            취소
          </Button>
        </div>
      </Modal>

      {/* 전체보기에서 "변수 추가"를 누르면 어느 일차에 적용할지 먼저 고른다 */}
      <Modal
        open={variableDayPickerOpen}
        title="어느 일차에 적용할까요?"
        onClose={() => setVariableDayPickerOpen(false)}
      >
        <div className={styles.situationList}>
          {Array.from({ length: dayCount }, (_, day) => day)
            .filter((day) => places.some((p) => (p.day ?? 0) === day))
            .map((day) => (
              <button
                key={day}
                type="button"
                className={styles.situationOption}
                onClick={() => {
                  setVariableDayPickerOpen(false);
                  setSelectedDay(day);
                  openSituationModal();
                }}
              >
                {day + 1}일차
              </button>
            ))}
        </div>
        <div className={styles.modalActions} style={{ marginTop: 16 }}>
          <Button variant="secondary" size="sm" onClick={() => setVariableDayPickerOpen(false)}>
            취소
          </Button>
        </div>
      </Modal>

      {/* 상황 변경 */}
      <Modal
        open={situationModalOpen}
        title="변수 추가"
        onClose={() => setSituationModalOpen(false)}
      >
        <p className={styles.modalSectionLabel}>상황을 직접 설명해주세요</p>
        <textarea
          className={styles.situationTextarea}
          value={situationFreeText}
          onChange={(e) => setSituationFreeText(e.target.value)}
          placeholder="예: 오늘 다리를 다쳐서 많이 못 걸어요 / 갑자기 비가 많이 와요"
          maxLength={300}
        />
        {situationFreeText.trim() && places.length < 2 ? (
          <p className={styles.warnBox}>방문지를 2곳 이상 추가한 후 사용할 수 있어요.</p>
        ) : null}
        <div className={styles.situationDivider}>또는 빠르게 선택</div>
        <p className={styles.modalSectionLabel}>어떤 상황이 생겼나요?</p>
        <div className={styles.situationList}>
          {SITUATION_VARS.map((sv) => (
            <button
              key={sv.id}
              type="button"
              className={
                situationVar === sv.id
                  ? `${styles.situationOption} ${styles.situationOptionActive}`
                  : styles.situationOption
              }
              onClick={() => setSituationVar(sv.id)}
            >
              {sv.label}
            </button>
          ))}
        </div>
        {situationVar === 'weather' ? (
          <>
            <p className={styles.modalSectionLabel} style={{ marginTop: 12 }}>
              날씨 종류
            </p>
            <div className={styles.situationRow}>
              {WEATHER_SUBS.map((wo) => (
                <button
                  key={wo.id}
                  type="button"
                  className={
                    situationSub === wo.id
                      ? `${styles.situationChip} ${styles.situationOptionActive}`
                      : styles.situationChip
                  }
                  onClick={() => setSituationSub(wo.id)}
                >
                  {wo.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {situationVar ? (
          <>
            <p className={styles.modalSectionLabel} style={{ marginTop: 12 }}>
              힘듦 정도
            </p>
            <div className={styles.situationRow}>
              {SEVERITY_LEVELS.map((sev) => (
                <button
                  key={sev.id}
                  type="button"
                  className={
                    situationSeverity === sev.id
                      ? `${styles.situationChip} ${styles.situationOptionActive}`
                      : styles.situationChip
                  }
                  onClick={() => setSituationSeverity(sev.id)}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
        <div className={styles.modalActions} style={{ marginTop: 16 }}>
          <Button variant="secondary" size="sm" onClick={() => setSituationModalOpen(false)}>
            취소
          </Button>
          <Button
            size="sm"
            onClick={applySituation}
            disabled={
              situationFreeText.trim()
                ? places.length < 2
                : !situationVar ||
                  !situationSeverity ||
                  (situationVar === 'weather' && !situationSub)
            }
          >
            {situationFreeText.trim() ? 'AI로 동선 재구성' : '동선 재계산'}
          </Button>
        </div>
      </Modal>

      {/* 출발지 선택 */}
      <Modal
        open={originSelectOpen}
        title="출발지를 선택해주세요"
        onClose={() => setOriginSelectOpen(false)}
      >
        <div className={styles.situationList}>
          <button
            type="button"
            className={styles.situationOption}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onClick={() => setOriginListExpanded((v) => !v)}
          >
            <span>
              {(() => {
                const chosen = originCandidatePlaces.find((p) => p.id === originChoiceId);
                if (!chosen) return '방문지를 선택해주세요';
                return isAllDaysView ? `${(chosen.day ?? 0) + 1}일차 · ${chosen.name}` : chosen.name;
              })()}
            </span>
            <span
              style={{
                display: 'inline-block',
                transform: originListExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform .15s',
              }}
            >
              ▼
            </span>
          </button>
          {originListExpanded ? (
            <div
              className={styles.situationList}
              style={{ marginTop: 6, maxHeight: 224, overflowY: 'auto' }}
            >
              {originCandidatePlaces.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={
                    originChoiceId === p.id
                      ? `${styles.situationOption} ${styles.situationOptionActive}`
                      : styles.situationOption
                  }
                  onClick={() => {
                    setOriginChoiceId(p.id);
                    setOriginListExpanded(false);
                  }}
                >
                  {isAllDaysView ? `${(p.day ?? 0) + 1}일차 · ${p.name}` : p.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div
          className={styles.modalActions}
          style={{ marginTop: 16, justifyContent: 'space-between' }}
        >
          <button
            type="button"
            className={styles.hint}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            onClick={() => {
              setOriginSelectOpen(false);
              setReturnToOriginPickerAfterAdd(true);
              openAddPlaceModal();
            }}
          >
            출발지가 방문지 목록에 없어요
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setOriginSelectOpen(false)}>
              취소
            </Button>
            <Button size="sm" onClick={confirmOriginChoice} disabled={originChoiceId == null}>
              선택
            </Button>
          </div>
        </div>
      </Modal>

      {/* 전체보기(2일 이상)에서 일차별 출발지를 한 번에 선택 */}
      <Modal
        open={multiDayOriginModalOpen}
        title="일차별 출발지를 선택해주세요"
        onClose={() => setMultiDayOriginModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: dayCount }, (_, day) => day)
            .map((day) => ({ day, dayPlaces: places.filter((p) => (p.day ?? 0) === day) }))
            .filter(({ dayPlaces }) => dayPlaces.length > 0)
            .map(({ day, dayPlaces }) => (
              <div key={day}>
                <label className={styles.hint} style={{ display: 'block', marginBottom: 4 }}>
                  {day + 1}일차
                </label>
                <select
                  value={multiDayOriginChoices[day] ?? dayPlaces[0].id}
                  onChange={(e) =>
                    setMultiDayOriginChoices((prev) => ({
                      ...prev,
                      [day]: Number(e.target.value),
                    }))
                  }
                  className={styles.daySelect}
                  style={{ width: '100%' }}
                >
                  {dayPlaces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
        </div>
        <div className={styles.modalActions} style={{ marginTop: 16 }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMultiDayOriginModalOpen(false)}
            disabled={multiDayRunning}
          >
            취소
          </Button>
          <Button size="sm" onClick={runMultiDayOptimalRoute} disabled={multiDayRunning}>
            {multiDayRunning ? '계산 중...' : '전체 계산'}
          </Button>
        </div>
      </Modal>

      {/* 출발지 확정 확인 */}
      <Modal
        open={originConfirmOpen}
        title="출발지 확인"
        onClose={() => setOriginConfirmOpen(false)}
      >
        <p className={styles.modalDesc}>
          출발지를 <strong>{places.find((p) => p.id === originChoiceId)?.name ?? ''}</strong>
          (으)로 설정하시겠습니까?
        </p>
        <div className={styles.modalActions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setOriginConfirmOpen(false);
              setOriginSelectOpen(true);
            }}
          >
            이전
          </Button>
          <Button size="sm" onClick={finalizeOrigin}>
            예
          </Button>
        </div>
      </Modal>

      {/* 변수 없음 확인 */}
      <Modal
        open={noVariableModalOpen}
        title="변수 추가가 안됐어요"
        onClose={() => setNoVariableModalOpen(false)}
      >
        <p className={styles.modalDesc}>변수를 추가하시겠습니까?</p>
        <div className={styles.modalActions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setNoVariableModalOpen(false);
              openSituationModal();
            }}
          >
            변수 추가하기
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setNoVariableModalOpen(false);
              if (pendingRouteOrigin != null) void runOptimalRoute(pendingRouteOrigin);
            }}
          >
            그냥 진행하기
          </Button>
        </div>
      </Modal>

      {/* 저장 안 된 변경사항 확인 */}
      <Modal
        open={leaveConfirmOpen}
        title={scheduleId ? '수정내용을 저장하시겠습니까?' : '저장하시겠습니까?'}
        onClose={() => setLeaveConfirmOpen(false)}
      >
        <p className={styles.modalDesc}>
          {scheduleId
            ? '변경한 내용이 아직 저장되지 않았어요. 저장하면 이 일정만 수정돼요.'
            : '변경한 내용이 아직 저장되지 않았어요. 저장하면 내 일정에 새로 추가돼요.'}
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={leaveWithoutSaving}>
            저장 안 함
          </Button>
          <Button size="sm" onClick={saveAndLeave}>
            저장
          </Button>
        </div>
      </Modal>

      {/* 삭제 확인 */}
      <Modal
        open={deleteConfirmOpen}
        title={
          deleteTargetId === 'ORIGINAL_ROUTE'
            ? '정말 삭제하시겠습니까?'
            : `${deleteTargetLabel}을 삭제하시겠습니까?`
        }
        onClose={closeDeleteConfirm}
      >
        {deleteTargetId === 'ORIGINAL_ROUTE' ? (
          <>
            <p className={styles.modalDesc}>
              이 일정을 삭제하면 모든 참여자의 일정에서 더 이상 확인할 수 없습니다.
            </p>
            <div className={styles.warnBox}>
              <div>⚠️ 모든 계정에서 삭제됩니다.</div>
              <div>⚠️ 공유된 일정과 저장된 일정에서도 더 이상 확인할 수 없습니다.</div>
              <div>⚠️ 삭제한 일정은 복구할 수 없습니다.</div>
            </div>
            <label className={styles.agreeRow}>
              <input
                type="checkbox"
                checked={deleteAgreeChecked}
                onChange={() => setDeleteAgreeChecked((v) => !v)}
              />
              <span>정말 삭제할 건지 확인했습니다</span>
            </label>
          </>
        ) : null}
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={closeDeleteConfirm}>
            {deleteTargetId === 'ORIGINAL_ROUTE' ? '뒤로가기' : '취소'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={confirmDelete}
            disabled={deleteTargetId === 'ORIGINAL_ROUTE' && !deleteAgreeChecked}
          >
            {deleteTargetId === 'ORIGINAL_ROUTE' ? '일정 삭제' : '삭제'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// Kakao Maps SDK 최소 인터페이스 (전역 타입 선언과 별개로, 이 화면에서 실제 쓰는 멤버만).
interface KakaoOverlayLike {
  setMap: (map: unknown) => void;
}
interface KakaoMapInstance {
  setBounds: (bounds: unknown) => void;
  setCenter: (pos: unknown) => void;
  setLevel: (level: number) => void;
  relayout: () => void;
}
