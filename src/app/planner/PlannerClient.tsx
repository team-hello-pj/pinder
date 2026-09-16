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
import { askAssistant, type ChatMessage, type RecommendedPlace } from '@/lib/chat';
import { requestAiRouteAdjustment } from '@/lib/route-adjust';
import {
  fetchRouteLeg,
  loadKakaoMapsSdk,
  searchKeyword,
  type KakaoPlaceDoc,
} from '@/lib/kakao/client';
import { fmtRange } from '@/lib/calendar';
import { tripDayCount } from '@/lib/format';
import { applySituationAdjustment, computeMockSteps, SEGMENT_DISTANCES } from '@/lib/route-engine';
import {
  createSchedule,
  deleteSchedule,
  getInviteLink,
  getSchedule,
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

const ADD_TO_ROUTE_SUGGESTION = '동선에 추가할까요?';

function buildSuggestionChips(
  suggestions: string[],
  recommendedPlaces: RecommendedPlace[],
): string[] {
  const base = suggestions.filter(Boolean).slice(0, 3);
  if (recommendedPlaces.length && !base.includes(ADD_TO_ROUTE_SUGGESTION)) {
    return [...base, ADD_TO_ROUTE_SUGGESTION];
  }
  return base;
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
  const [nextId, setNextId] = useState(1);
  const [segments, setSegments] = useState<TransportMode[]>([]);
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
  const [newAddressDay, setNewAddressDay] = useState(0);
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

  // ---- 지도 / 검색 ----
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<KakaoMapInstance | null>(null);
  const kakaoMarkersRef = useRef<KakaoOverlayLike[]>([]);
  const kakaoPolylineRef = useRef<KakaoOverlayLike | null>(null);
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
  const [situationModalOpen, setSituationModalOpen] = useState(false);
  const [situationVar, setSituationVar] = useState<string | null>(null);
  const [situationSub, setSituationSub] = useState<string | null>(null);
  const [situationSeverity, setSituationSeverity] = useState<string | null>(null);
  const [situationFreeText, setSituationFreeText] = useState('');
  const [loading, setLoading] = useState(false);

  // ---- 협업 / 권한 ----
  const { isLoggedIn, isLoading: sessionLoading, user } = useSession();
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [role, setRole] = useState<ScheduleRole>('creator');
  const [members, setMembers] = useState<Member[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [myEditRequestPending, setMyEditRequestPending] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [permission, setPermission] = useState<'edit' | 'view'>('edit');
  const [permissionMenuOpen, setPermissionMenuOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copyLabel, setCopyLabel] = useState('복사');
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

  const segmentCacheKey = useCallback(
    (idx: number, mode?: TransportMode) => {
      const a = places[idx];
      const b = places[idx + 1];
      const m = mode ?? segments[idx];
      if (!a || !b) return `_${idx}`;
      return `${m}_${a.id}_${b.id}_${criteria}`;
    },
    [places, segments, criteria],
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
    const withCoords = places.filter((p) => p.x && p.y);
    if (!withCoords.length) return;
    const bounds = new kakao.maps.LatLngBounds();
    withCoords.forEach((p) => {
      const pos = new kakao.maps.LatLng(p.y as number, p.x as number);
      const marker = new kakao.maps.Marker({ position: pos, map });
      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: `<div style="background:#7BCB93;color:#12321F;font-size:11px;font-weight:700;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;transform:translateY(-28px)">${places.indexOf(p) + 1}</div>`,
      });
      overlay.setMap(map);
      kakaoMarkersRef.current.push(marker, overlay);
      bounds.extend(pos);
    });
    map.setBounds(bounds);
  }, [places]);

  useEffect(() => {
    if (kakaoReady) syncKakaoMarkers();
  }, [kakaoReady, syncKakaoMarkers]);

  const syncKakaoPolyline = useCallback(() => {
    if (kakaoPolylineRef.current) {
      kakaoPolylineRef.current.setMap(null);
      kakaoPolylineRef.current = null;
    }
    const kakao = window.kakao;
    const map = kakaoMapRef.current;
    if (!map || !kakao) return;
    const allPoints: { x: number; y: number }[] = [];
    for (let idx = 0; idx < segments.length; idx++) {
      const cache = routeCache[segmentCacheKey(idx)];
      if (!cache || 'failed' in cache || !cache.pathPoints?.length) return;
      cache.pathPoints.forEach((pt) => allPoints.push(pt));
    }
    if (allPoints.length < 2) return;
    const path = allPoints.map((pt) => new kakao.maps.LatLng(pt.y, pt.x));
    kakaoPolylineRef.current = new kakao.maps.Polyline({
      map,
      path,
      strokeWeight: 4,
      strokeColor: '#2C8F4A',
      strokeOpacity: 0.85,
      strokeStyle: 'solid',
    });
  }, [segments, routeCache, segmentCacheKey]);

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
    },
    [],
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
        sessionStorage.setItem(
          PENDING_INVITE_KEY,
          JSON.stringify({ token: inviteToken, role: inviteRole }),
        );
        router.push('/login');
        return;
      }
      joinSchedule(inviteToken, inviteRole).then((scheduleIdResult) => {
        if (scheduleIdResult) router.replace(`/planner?loadRoute=${scheduleIdResult}`);
        else showToast('초대 링크가 유효하지 않아요.');
      });
      return;
    }

    if (isLoggedIn) {
      const pendingRaw = sessionStorage.getItem(PENDING_INVITE_KEY);
      if (pendingRaw) {
        sessionStorage.removeItem(PENDING_INVITE_KEY);
        try {
          const pending = JSON.parse(pendingRaw) as { token: string; role: 'editor' | 'viewer' };
          joinSchedule(pending.token, pending.role).then((scheduleIdResult) => {
            if (scheduleIdResult) router.replace(`/planner?loadRoute=${scheduleIdResult}`);
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
    if (qStart || qEnd) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTripStart(qStart || '');
      setTripEnd(qEnd || qStart || '');
    }
    if (isNewRoute && !hasTripDateParam) setNewTripDateModalOpen(true);

    if (searchParams.get('mode') === 'ai') {
      const handoff = consumeAiRouteHandoff();
      if (handoff) {
        setPlaces(handoff.places);
        setSegments(handoff.segments);
        setNextId(handoff.places.length + 1);
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
      else if (addConfirmOpen) setAddConfirmOpen(false);
      else if (situationModalOpen) setSituationModalOpen(false);
      else if (deleteConfirmOpen) setDeleteConfirmOpen(false);
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
    deleteConfirmOpen,
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
  const addSelectedPlace = (doc: KakaoPlaceDoc, nameOverride?: string) => {
    const day = newAddressDay || 0;
    const name = nameOverride?.trim() || doc.place_name;
    setPlaces((prev) => {
      const next: Place[] = [
        ...prev,
        {
          id: nextId,
          name,
          category: doc.category_group_name || '미분류',
          address: doc.road_address_name || doc.address_name,
          roadAddress: doc.road_address_name,
          jibunAddress: doc.address_name,
          placeId: doc.id,
          x: Number(doc.x),
          y: Number(doc.y),
          priority: 'normal',
          duration: 15,
          hours: 'unknown',
          hoursLabel: '영업시간 확인 필요',
          visitTime: '',
          packItems: '',
          weather: 'sunny',
          day,
        },
      ];
      setSegments((segs) => resizeSegments(next, segs));
      return next;
    });
    setNextId((n) => n + 1);
    setNewAddress('');
    setPendingSelectedDoc(null);
    setRouteCache({});
    logActivity(`${name}을 추가했습니다`);
    showToast('방문지가 일정에 추가됐어요');
  };

  /** 검색 결과 항목을 클릭하면 바로 "방문지를 추가할까요?" 팝업을 정해진 상태로 띄운다. */
  const openAddConfirmForDoc = (doc: KakaoPlaceDoc) => {
    selectMapResult(doc);
    setPendingSelectedDoc(doc);
    setPendingName(doc.place_name);
    setPendingAddress(doc.road_address_name || doc.address_name);
    setAddConfirmOpen(true);
  };

  const confirmAddPlace = () => {
    if (!pendingSelectedDoc) return;
    const name = pendingName.trim();
    if (!name) return;
    addSelectedPlace(pendingSelectedDoc, name);
    setAddConfirmOpen(false);
    setPendingAddress('');
    setPendingName('');
  };

  const deletePlace = (id: number) => {
    const place = places.find((p) => p.id === id);
    setPlaces((prev) => {
      const next = prev.filter((p) => p.id !== id);
      setSegments((segs) => resizeSegments(next, segs));
      return next;
    });
    if (place) logActivity(`${place.name}을(를) 삭제했습니다`);
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
  const cyclePriority = (id: number) => {
    const PRIORITY_ORDER = ['high', 'normal', 'low'] as const;
    const place = places.find((p) => p.id === id);
    if (!place) return;
    const next = PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(place.priority) + 1) % 3];
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, priority: next } : p)));
    logActivity(
      `${place.name}의 우선순위를 ${next === 'high' ? '급한 방문' : next === 'low' ? '낮음' : '보통'}(으)로 변경했습니다`,
    );
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
    setPlaces((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(idx, 0, moved);
      setSegments((segs) => resizeSegments(arr, segs));
      return arr;
    });
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
        setRouteCache((prev) => ({
          ...prev,
          [key]: { failed: true, errorMsg: '경로 정보를 불러오지 못했습니다' },
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- routeCache 는 캐시 존재 확인용으로만 읽는다
    [places],
  );

  const searchAllRoutes = async () => {
    if (routeSearching || segments.length < 1) return;
    setRouteSearching(true);
    const tasks: Promise<void>[] = [];
    for (let idx = 0; idx < segments.length; idx++) {
      for (const mode of MODE_ORDER)
        tasks.push(fetchSegmentRouteForModeWithCriteria(idx, mode, criteria));
    }
    await Promise.all(tasks);
    setRouteSearching(false);
    syncKakaoPolyline();
    logActivity('경로를 검색했습니다');
    showToast('실제 경로 검색이 완료됐어요');
  };

  const setCriteria = (c: RouteCriteria) => {
    setCriteriaState(c);
    for (let idx = 0; idx < segments.length; idx++) {
      for (const mode of MODE_ORDER) fetchSegmentRouteForModeWithCriteria(idx, mode, c);
    }
  };

  const recalcAndSearch = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 300);
    searchAllRoutes();
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
          priority: p.priority,
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
    if (searchMode) return;
    setSearchMode(true);
    setMapSearchBarCollapsed(false);
    setMapSearchQuery(newAddress);
    setMapSearchResults([]);
    setMapSearchError(null);
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
  const saveCurrentRoute = async () => {
    if (places.length === 0 && !scheduleId) return;
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
      return;
    }
    if (!scheduleId) setScheduleId(saved.id);
    lastTitleRef.current = saved.title;
    setSaveLabel('저장됨');
    logActivity(`현재 일정을 "${saved.title}"으로 저장했습니다`);
    setTimeout(() => setSaveLabel('저장'), 1500);
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
  const copyInvite = async () => {
    if (!scheduleId) return;
    const link = await getInviteLink(scheduleId, permission === 'edit' ? 'editor' : 'viewer');
    if (!link) {
      showToast('초대 링크를 만들지 못했어요.');
      return;
    }
    setInviteLink(link);
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopyLabel('복사됨');
    setTimeout(() => setCopyLabel('복사'), 1200);
  };
  const requestEditPermission = async () => {
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
      const cache = routeCache[segmentCacheKey(i)];
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
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: res.reply,
          suggestions: buildSuggestionChips(res.suggestions, res.recommendedPlaces),
          recommendedPlaces: res.recommendedPlaces,
        },
      ]);
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

  const addRecommendedPlaces = async (recs: RecommendedPlace[]) => {
    if (!recs.length || addingRecommended) return;
    setAddingRecommended(true);
    let added = 0;
    for (const rec of recs) {
      const query = rec.address ? `${rec.name} ${rec.address}` : rec.name;
      const geo = await geocodePlace(query);
      const placeId = nextId + added;
      setPlaces((prev) => {
        const next: Place[] = [
          ...prev,
          {
            id: placeId,
            name: rec.name,
            category: '미분류',
            address: rec.address || rec.name,
            priority: 'normal',
            duration: 15,
            hours: 'unknown',
            hoursLabel: '영업시간 확인 필요',
            visitTime: '',
            packItems: '',
            weather: 'sunny',
            day: selectedDay ?? 0,
            x: geo?.x ?? null,
            y: geo?.y ?? null,
          },
        ];
        setSegments((segs) => resizeSegments(next, segs));
        return next;
      });
      added += 1;
    }
    setNextId((n) => n + added);
    setRouteCache({});
    logActivity(`AI 추천 장소 ${added}곳을 동선에 추가했습니다`);
    showToast(`${added}곳을 동선에 추가했어요`);
    setAddingRecommended(false);
  };

  // ---- 파생 값 ----
  const dayCount = tripDayCount(tripStart, tripEnd);
  const hasDayTabs = dayCount > 1;
  const dayTabs = hasDayTabs
    ? Array.from({ length: dayCount }, (_, di) => ({ value: di, label: `${di + 1}일차` }))
    : [];

  const firstNonHighIdx = places.findIndex((p) => p.priority !== 'high');
  const urgentPushedNames =
    firstNonHighIdx === -1
      ? []
      : places.filter((p, i) => p.priority === 'high' && i > firstNonHighIdx).map((p) => p.name);

  const enrichedSegments = useMemo(
    () =>
      segments.map((mode, idx) => {
        const fromP = places[idx];
        const toP = places[idx + 1];
        const cached = routeCache[segmentCacheKey(idx)];
        const hasRealCoords = Boolean(fromP?.x && fromP?.y && toP?.x && toP?.y);
        let steps: SegmentStep[];
        let status: 'ok' | 'unsearched' | 'failed' = 'ok';

        if (cached && !('failed' in cached)) {
          if (mode === 'transit' && cached.transitSteps?.length) {
            steps = cached.transitSteps.map((ts) => ({
              mode: ts.type === 'WALKING' ? 'walk' : 'transit',
              arrowLabel: ts.type === 'WALKING' ? '도보' : ts.type === 'SUBWAY' ? '지하철' : '버스',
              minutes: ts.minutes ?? 0,
              distanceKm: ts.distanceKm ?? 0,
              nodeLabel: ts.type === 'WALKING' ? ts.toName || ts.fromName : ts.vehicleName,
            }));
          } else if (mode !== 'transit' && cached.roadSteps?.length) {
            // 자동차/도보/자전거: 실제 도로명·안내문구를 구간별로 보여준다.
            steps = cached.roadSteps.map((rs) => ({
              mode,
              arrowLabel: MODE_MAP[mode].label,
              minutes: rs.minutes,
              distanceKm: rs.distanceKm,
              nodeLabel: rs.name,
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
          steps,
          expanded,
        };
      }),
    [segments, places, routeCache, segmentCacheKey, expandedSegments],
  );

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
      if (i < enrichedSegments.length && (selectedDay === null || day === selectedDay)) {
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
    const cached = routeCache[segmentCacheKey(idx - 1, segments[idx - 1])];
    if (cached && !('failed' in cached) && cached.landingURL) return cached.landingURL;
    const sName = encodeURIComponent(prev.name || '출발지');
    const eName = encodeURIComponent(p.name || '도착지');
    return `https://map.kakao.com/link/from/${sName},${prev.y},${prev.x}/to/${eName},${p.y},${p.x}`;
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
                <Link href="/" className={styles.panelLogo}>
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
                    링크가 있는 사람은{' '}
                    {permission === 'edit' ? '함께 수정할 수 있어요' : '보기만 할 수 있어요'}
                  </p>
                  <div className={styles.inviteLinkRow}>
                    <span className={styles.inviteLink}>
                      {inviteLink || '복사 버튼을 눌러 링크를 만드세요'}
                    </span>
                    <button type="button" className={styles.inviteCopyBtn} onClick={copyInvite}>
                      {copyLabel}
                    </button>
                  </div>
                  <div className={styles.permissionMenuWrap}>
                    <button
                      type="button"
                      className={styles.permissionMenuBtn}
                      onClick={() => setPermissionMenuOpen((v) => !v)}
                    >
                      {permission === 'edit' ? '편집 가능' : '보기 전용'} ⌄
                    </button>
                    {permissionMenuOpen ? (
                      <div className={styles.permissionMenu}>
                        <button
                          type="button"
                          className={styles.permissionMenuItem}
                          onClick={() => {
                            setPermission('edit');
                            setInviteLink('');
                            setPermissionMenuOpen(false);
                          }}
                        >
                          편집 가능
                        </button>
                        <button
                          type="button"
                          className={styles.permissionMenuItem}
                          onClick={() => {
                            setPermission('view');
                            setInviteLink('');
                            setPermissionMenuOpen(false);
                          }}
                        >
                          보기 전용
                        </button>
                      </div>
                    ) : null}
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

            {urgentPushedNames.length > 0 ? (
              <p className={styles.urgentNotice}>
                ⚠ 급한 방문지 {urgentPushedNames.join(', ')}이(가) 뒤 순서로 밀렸어요
              </p>
            ) : null}

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
                {canEdit ? <span className={styles.hint}>드래그로 순서 변경</span> : null}
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
                  <button type="button" className={styles.emptyAddBtn} onClick={openSearchMode}>
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
                      <div key={i} className={styles.dayDivider}>
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
                        isLast={item.index === places.length - 1}
                        isDragging={dragIndex === item.index}
                        expanded={Boolean(expandedPlaces[item.place.id])}
                        memoSaved={Boolean(savedMemoIds[item.place.id])}
                        canEdit={canEdit}
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
                          onCyclePriority: cyclePriority,
                        }}
                      />
                    );
                  }
                  const seg = enrichedSegments[item.index];
                  if (!seg) return null;
                  return (
                    <SegmentConnector
                      key={i}
                      mode={seg.mode}
                      totalMinutes={seg.totalMinutes}
                      totalDistanceKm={seg.totalDistanceKm}
                      transfers={seg.transfers}
                      status={seg.status}
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
                {hasDayTabs ? (
                  <select
                    value={String(Math.min(newAddressDay, dayCount - 1))}
                    onChange={(e) => setNewAddressDay(Number(e.target.value))}
                    className={styles.daySelectSmall}
                  >
                    {dayTabs.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                ) : null}
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
                          openSearchMode();
                          runMapSearch();
                        }
                      }}
                      onFocus={openSearchMode}
                      placeholder="주소를 검색하여 추가하기"
                      className={styles.addInput}
                    />
                    <button
                      type="button"
                      className={styles.addBtn}
                      onClick={() => {
                        openSearchMode();
                        runMapSearch();
                      }}
                    >
                      검색
                    </button>
                  </>
                ) : null}
              </div>
              {canEdit ? (
                <p className={styles.addHint}>여러 줄 붙여넣기·엑셀 업로드도 지원할 예정</p>
              ) : null}
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
                              disabled={s === ADD_TO_ROUTE_SUGGESTION && addingRecommended}
                              onClick={() =>
                                s === ADD_TO_ROUTE_SUGGESTION && msg.recommendedPlaces?.length
                                  ? addRecommendedPlaces(msg.recommendedPlaces)
                                  : sendAiMessage(s)
                              }
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
                    onClick={openSituationModal}
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
                  {isViewerRole ? '내 일정에서 제거' : saveLabel}
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
                  <Button size="md" onClick={recalcAndSearch} disabled={loading}>
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
          <Button size="sm" onClick={() => setNewTripDateModalOpen(false)}>
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
      <Modal
        open={addConfirmOpen}
        title="방문지를 추가할까요?"
        onClose={() => setAddConfirmOpen(false)}
      >
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
          <Button variant="secondary" size="sm" onClick={() => setAddConfirmOpen(false)}>
            취소
          </Button>
          <Button size="sm" onClick={confirmAddPlace} disabled={!pendingName.trim()}>
            추가
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
