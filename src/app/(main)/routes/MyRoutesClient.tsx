'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ROUTES } from '@/constants';
import { fmtRange } from '@/lib/calendar';
import {
  deleteSchedule,
  listSchedules,
  updateSchedule,
  type ScheduleInput,
  type ScheduleSummary,
} from '@/lib/schedules';
import { useSession } from '@/components/providers/SessionProvider';
import { AuthorAvatar, Button, DateRangeCalendar, Modal } from '@/components/ui';

import { NewTripFlow, type NewTripFlowHandle } from './NewTripFlow';
import styles from './my-routes.module.css';

const PAGE_SIZE = 5;
type StatusTab = 'upcoming' | 'done';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** legacy/My Routes.dc.html 을 그대로 이식. 헤더/푸터는 (main) 레이아웃이 담당한다. */
export function MyRoutesClient() {
  const router = useRouter();
  const { isLoggedIn, isLoading: sessionLoading, user } = useSession();
  const myName = user?.nickname || user?.name || '';
  const [routes, setRoutes] = useState<ScheduleSummary[] | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // ---- 일정 수정 팝업 (제목 + 날짜, 제작자 전용) ----
  const [routeEditOpen, setRouteEditOpen] = useState(false);
  const [routeEditId, setRouteEditId] = useState<string | null>(null);
  const [routeEditTitle, setRouteEditTitle] = useState('');
  const [routeEditStart, setRouteEditStart] = useState('');
  const [routeEditEnd, setRouteEditEnd] = useState('');
  const [routeEditCalYear, setRouteEditCalYear] = useState(new Date().getFullYear());
  const [routeEditCalMonth, setRouteEditCalMonth] = useState(new Date().getMonth());

  const newTripFlowRef = useRef<NewTripFlowHandle>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');

  const [statusTab, setStatusTab] = useState<StatusTab>('upcoming');
  const [page, setPage] = useState(0);

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (sessionLoading || !isLoggedIn) return;
    let cancelled = false;
    listSchedules().then((list) => {
      if (!cancelled) setRoutes(list);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionLoading, isLoggedIn]);

  const showToast = (message: string) => {
    setToastMsg(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  // ---- 새 일정 만들기 ----
  const openNewTripFlow = () => newTripFlowRef.current?.open();

  // ---- 삭제 ----
  const openDeleteConfirm = (route: ScheduleSummary) => {
    setDeleteTargetId(route.id);
    setDeleteTargetName(route.title);
    setDeleteConfirmOpen(true);
  };
  const confirmDelete = async () => {
    if (!routes || !deleteTargetId) return;
    const ok = await deleteSchedule(deleteTargetId);
    if (!ok) {
      setDeleteConfirmOpen(false);
      showToast('삭제하지 못했어요. 다시 시도해주세요.');
      return;
    }
    setRoutes(routes.filter((r) => r.id !== deleteTargetId));
    setDeleteConfirmOpen(false);
    showToast('내 일정 1건이 삭제되었습니다');
  };

  // ---- 이름 수정 (카카오톡 단톡방 이름처럼, 내 계정 화면에서만 보이는 개인화 이름) ----
  const startEdit = (route: ScheduleSummary) => {
    setEditingId(route.id);
    setEditValue(route.title);
  };
  const saveEdit = async () => {
    if (!routes || !editingId) return;
    const name = editValue.trim();
    const id = editingId;
    setEditingId(null);
    if (!name) return;
    const updated = await updateSchedule(id, { personalTitle: name });
    if (!updated) return;
    setRoutes(routes.map((r) => (r.id === id ? { ...r, ...updated } : r)));
  };

  // ---- 일정 수정 팝업 (제목은 누구나, 날짜는 제작자만) ----
  const openRouteEdit = (route: ScheduleSummary) => {
    const start = route.tripStart || todayStr();
    const [y, m] = start.split('-').map(Number);
    setRouteEditId(route.id);
    setRouteEditTitle(route.title);
    setRouteEditStart(start);
    setRouteEditEnd(route.tripEnd || start);
    setRouteEditCalYear(y);
    setRouteEditCalMonth(m - 1);
    setRouteEditOpen(true);
  };
  const onRouteEditCalDayClick = (dateStr: string) => {
    if (!routeEditStart || (routeEditStart && routeEditEnd && routeEditStart !== routeEditEnd)) {
      setRouteEditStart(dateStr);
      setRouteEditEnd(dateStr);
      return;
    }
    if (dateStr < routeEditStart) {
      setRouteEditEnd(routeEditStart);
      setRouteEditStart(dateStr);
      return;
    }
    setRouteEditEnd(dateStr);
  };
  const routeEditRoute = routes?.find((r) => r.id === routeEditId) ?? null;
  const saveRouteEdit = async () => {
    if (!routes || !routeEditId) return;
    const id = routeEditId;
    const name = routeEditTitle.trim();
    const isCreator = routeEditRoute?.role === 'creator';
    setRouteEditOpen(false);
    const patch: Partial<ScheduleInput> = {};
    if (name) patch.personalTitle = name;
    if (isCreator) {
      patch.tripStart = routeEditStart;
      patch.tripEnd = routeEditEnd;
    }
    const updated = await updateSchedule(id, patch);
    if (!updated) return;
    setRoutes(routes.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    showToast('일정이 변경되었습니다');
  };

  // ---- 목록 가공 ----
  const enriched = useMemo(() => {
    const list = routes ?? [];
    return list.map((r) => ({
      ...r,
      isDone: Boolean(r.tripEnd && r.tripEnd < todayStr()),
      dateLabel:
        fmtRange(r.tripStart, r.tripEnd) || new Date(r.updatedAt).toLocaleDateString('ko-KR'),
      placeChips: r.places.slice(0, 3).map((p) => p.name),
      moreChipsCount: Math.max(0, r.places.length - 3),
    }));
  }, [routes]);

  const filtered = enriched.filter((r) => (statusTab === 'done' ? r.isDone : !r.isDone));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedRoutes = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  if (sessionLoading) return null; // 인증 상태 확인 중 (비로그인으로 오판하지 않도록 대기)

  if (isLoggedIn && routes === null) return null; // 로그인 상태에서 내 일정 초기 로드 중

  const hasRoutes = isLoggedIn && (routes?.length ?? 0) > 0;
  // 로그인하지 않은 사용자는 뒤에 빈 상태 화면을 그대로 둔 채(레이아웃이 비어 보이지 않도록),
  // 이 모달로 로그인/회원가입을 안내한다 — 닫으면(X, ESC) 홈으로 돌려보낸다.
  const authGateOpen = !isLoggedIn;

  return (
    <div className={styles.page}>
      <div className={styles.headRow}>
        <div>
          <h1 className={styles.title}>내 일정</h1>
          <p className={styles.subtitle}>저장해둔 동선을 확인하고 이어서 계획할 수 있어요</p>
        </div>
        <button type="button" className={styles.newBtn} onClick={openNewTripFlow}>
          ＋ 새 일정
        </button>
      </div>

      {hasRoutes ? (
        <>
          <div className={styles.tabs}>
            {(['upcoming', 'done'] as StatusTab[]).map((tab) => {
              const count = enriched.filter((r) => (tab === 'done' ? r.isDone : !r.isDone)).length;
              const active = statusTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                  onClick={() => {
                    setStatusTab(tab);
                    setPage(0);
                  }}
                >
                  {tab === 'upcoming' ? '예정된 일정' : '완료된 일정'} ({count})
                </button>
              );
            })}
          </div>

          <div className={styles.list}>
            {pagedRoutes.map((route) => (
              <div key={route.id} className={styles.card}>
                <div className={styles.cardBody}>
                  <div className={styles.titleRow}>
                    {editingId === route.id ? (
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className={styles.editInput}
                      />
                    ) : (
                      <div
                        className={styles.cardName}
                        onClick={() => startEdit(route)}
                        title="클릭해서 제목 수정"
                      >
                        {route.title}
                      </div>
                    )}

                    <div className={styles.cardActions}>
                      <a
                        href={`/planner?loadRoute=${encodeURIComponent(route.id)}`}
                        className={styles.openBtn}
                      >
                        열기
                      </a>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => openDeleteConfirm(route)}
                        aria-label="삭제"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className={styles.cardMeta}>
                    {route.dateLabel} · 방문지 {route.places.length}곳
                  </div>

                  {route.members && route.members.length > 0 ? (
                    <div className={styles.members}>
                      {route.members.map((m) => {
                        const isMe = m.nickname === myName;
                        return (
                          <span key={m.nickname} className={styles.member}>
                            <span className={styles.memberAvatar}>
                              {m.isOwner ? <span className={styles.ownerCrown}>👑</span> : null}
                              <AuthorAvatar
                                name={m.nickname}
                                avatarUrl={isMe ? (user?.avatarUrl ?? null) : null}
                                isMine={isMe}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '50%',
                                  fontSize: 9,
                                  fontWeight: 700,
                                }}
                              />
                            </span>
                            <span>{m.nickname}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className={styles.chipsRow}>
                    <div className={styles.chips}>
                      {route.placeChips.map((name) => (
                        <span key={name} className={styles.chip}>
                          {name}
                        </span>
                      ))}
                      {route.moreChipsCount > 0 ? (
                        <span className={styles.moreChip}>+{route.moreChipsCount}</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={styles.routeEditBtn}
                      onClick={() => openRouteEdit(route)}
                      aria-label="일정 수정"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#878A93"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pageCount > 1 ? (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageNav}
                style={{ opacity: currentPage === 0 ? 0.4 : 1 }}
                onClick={() => setPage(Math.max(0, currentPage - 1))}
                aria-label="이전 페이지"
              >
                ‹
              </button>
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={
                    i === currentPage ? `${styles.pageNum} ${styles.pageNumActive}` : styles.pageNum
                  }
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                className={styles.pageNav}
                style={{ opacity: currentPage === pageCount - 1 ? 0.4 : 1 }}
                onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
                aria-label="다음 페이지"
              >
                ›
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className={styles.empty}>
          <button
            type="button"
            className={styles.emptyIcon}
            onClick={openNewTripFlow}
            aria-label="새 일정 만들기"
          >
            ＋
          </button>
          <div className={styles.emptyTitle}>저장된 일정이 없어요</div>
          <p className={styles.emptyDesc}>
            Route Planner에서 방문지를 추가하고
            <br />
            &quot;저장&quot;을 누르면 여기에 나타나요
          </p>
          <button type="button" className={styles.emptyCta} onClick={openNewTripFlow}>
            새 일정 만들기
          </button>
        </div>
      )}

      <NewTripFlow ref={newTripFlowRef} />

      {/* 비회원 안내 — 로그인하지 않았으면 내 일정 기능을 쓸 수 없으니 안내하고 로그인/
          회원가입으로 보낸다. 닫으면(X, ESC) 홈으로 돌려보낸다. */}
      <Modal
        open={authGateOpen}
        title="회원만 이용할 수 있어요"
        onClose={() => router.push(ROUTES.home)}
      >
        <p className={styles.deleteDesc}>
          로그인하면 내 일정의 다양한 기능을
          <br />
          이용할 수 있어요.
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => router.push(ROUTES.login)}>
            로그인
          </Button>
          <Button size="sm" onClick={() => router.push(ROUTES.signup)}>
            회원가입
          </Button>
        </div>
      </Modal>

      {/* 삭제 확인 */}
      <Modal
        open={deleteConfirmOpen}
        title="내 일정에서 삭제하시겠습니까?"
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <p className={styles.deleteDesc}>내 일정 목록에서만 제거됩니다.</p>
        <div className={styles.deleteNotice}>
          <div>✓ 공유된 원본 일정은 삭제되지 않습니다.</div>
          <div>✓ 다른 참여자의 일정에는 영향을 주지 않습니다.</div>
        </div>
        <p className={styles.deleteTarget}>&quot;{deleteTargetName}&quot;</p>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
            취소
          </Button>
          <Button variant="danger" size="sm" onClick={confirmDelete}>
            내 일정에서 삭제
          </Button>
        </div>
      </Modal>

      {/* 일정 수정 — 제목은 누구나, 날짜(달력)는 제작자만 보인다 */}
      <Modal open={routeEditOpen} title="일정 수정" onClose={() => setRouteEditOpen(false)}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>방문지 이름</span>
          <input
            value={routeEditTitle}
            onChange={(e) => setRouteEditTitle(e.target.value)}
            className={styles.fieldInput}
          />
        </div>
        {routeEditRoute?.role === 'creator' ? (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>날짜</span>
            <DateRangeCalendar
              variant="compact"
              year={routeEditCalYear}
              month={routeEditCalMonth}
              start={routeEditStart}
              end={routeEditEnd}
              onDayClick={onRouteEditCalDayClick}
              onPrevMonth={() => {
                let m = routeEditCalMonth - 1;
                let y = routeEditCalYear;
                if (m < 0) {
                  m = 11;
                  y -= 1;
                }
                setRouteEditCalMonth(m);
                setRouteEditCalYear(y);
              }}
              onNextMonth={() => {
                let m = routeEditCalMonth + 1;
                let y = routeEditCalYear;
                if (m > 11) {
                  m = 0;
                  y += 1;
                }
                setRouteEditCalMonth(m);
                setRouteEditCalYear(y);
              }}
            />
          </div>
        ) : null}
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setRouteEditOpen(false)}>
            취소
          </Button>
          <Button size="sm" onClick={saveRouteEdit}>
            저장
          </Button>
        </div>
      </Modal>

      {toastVisible ? (
        <div className={styles.toast}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7BCB93"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {toastMsg}
        </div>
      ) : null}
    </div>
  );
}
