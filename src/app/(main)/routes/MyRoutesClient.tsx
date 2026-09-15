'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { avatarColorFor } from '@/lib/avatar';
import { fmtDateLabel, fmtRange } from '@/lib/calendar';
import { loadSavedRoutes, saveRoutes } from '@/lib/storage';
import { Button, DateRangeCalendar, Modal } from '@/components/ui';
import type { SavedRoute } from '@/types';

import styles from './my-routes.module.css';

const PAGE_SIZE = 5;
type StatusTab = 'upcoming' | 'done';
type CreateMode = 'manual' | 'ai';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** legacy/My Routes.dc.html 을 그대로 이식. 헤더/푸터는 (main) 레이아웃이 담당한다. */
export function MyRoutesClient() {
  const router = useRouter();
  const [routes, setRoutes] = useState<SavedRoute[] | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const [dateEditingId, setDateEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [cardCalYear, setCardCalYear] = useState(new Date().getFullYear());
  const [cardCalMonth, setCardCalMonth] = useState(new Date().getMonth());

  const [modeSelectOpen, setModeSelectOpen] = useState(false);
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('manual');
  const [newTripStart, setNewTripStart] = useState(todayStr());
  const [newTripEnd, setNewTripEnd] = useState('');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState('');

  const [statusTab, setStatusTab] = useState<StatusTab>('upcoming');
  const [page, setPage] = useState(0);

  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    // localStorage 는 클라이언트에만 있어 서버 렌더와 맞출 수 없으므로, 마운트 후
    // 한 번만 읽어와 로딩 상태(null)에서 실제 목록으로 전환한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutes(loadSavedRoutes());
  }, []);

  const persist = (next: SavedRoute[]) => {
    setRoutes(next);
    saveRoutes(next);
  };

  const showToast = (message: string) => {
    setToastMsg(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  // ---- 새 일정 만들기 ----
  const openNewTripFlow = () => {
    setNewTripStart(todayStr());
    setNewTripEnd('');
    setModeSelectOpen(true);
  };
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

  // ---- 삭제 ----
  const openDeleteConfirm = (route: SavedRoute) => {
    setDeleteTargetId(route.id);
    setDeleteTargetName(route.title);
    setDeleteConfirmOpen(true);
  };
  const confirmDelete = () => {
    if (!routes || !deleteTargetId) return;
    persist(routes.filter((r) => r.id !== deleteTargetId));
    setDeleteConfirmOpen(false);
    showToast('내 일정 1건이 삭제되었습니다');
  };

  // ---- 이름 수정 ----
  const startEdit = (route: SavedRoute) => {
    setEditingId(route.id);
    setEditValue(route.title);
  };
  const saveEdit = () => {
    if (!routes || !editingId) return;
    const name = editValue.trim();
    persist(
      routes.map((r) =>
        r.id === editingId ? { ...r, title: name || r.title, customName: true } : r,
      ),
    );
    setEditingId(null);
  };

  // ---- 날짜 수정 (카드 내 팝오버) ----
  const startDateEdit = (route: SavedRoute) => {
    const start = route.tripStart || todayStr();
    const [y, m] = start.split('-').map(Number);
    setDateEditingId(route.id);
    setEditStart(start);
    setEditEnd(route.tripEnd || start);
    setCardCalYear(y);
    setCardCalMonth(m - 1);
  };
  const onCardCalDayClick = (dateStr: string) => {
    if (!editStart || (editStart && editEnd && editStart !== editEnd)) {
      setEditStart(dateStr);
      setEditEnd(dateStr);
      return;
    }
    if (dateStr < editStart) {
      setEditEnd(editStart);
      setEditStart(dateStr);
      return;
    }
    setEditEnd(dateStr);
  };
  const saveDateEdit = () => {
    if (!routes || !dateEditingId) return;
    persist(
      routes.map((r) =>
        r.id === dateEditingId ? { ...r, tripStart: editStart, tripEnd: editEnd } : r,
      ),
    );
    setDateEditingId(null);
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

  if (routes === null) return null; // 초기 로드 중 (localStorage 읽기)

  const hasRoutes = routes.length > 0;

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

                <div className={styles.cardBody}>
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

                  {dateEditingId === route.id ? (
                    <div className={styles.dateEditWrap}>
                      <div
                        className={styles.overlayCatcher}
                        onClick={() => setDateEditingId(null)}
                      />
                      <div className={styles.dateEditTrigger}>
                        {editStart} - {editEnd}
                      </div>
                      <div className={styles.dateEditPopover}>
                        <DateRangeCalendar
                          variant="compact"
                          year={cardCalYear}
                          month={cardCalMonth}
                          start={editStart}
                          end={editEnd}
                          onDayClick={onCardCalDayClick}
                          onPrevMonth={() => {
                            let m = cardCalMonth - 1;
                            let y = cardCalYear;
                            if (m < 0) {
                              m = 11;
                              y -= 1;
                            }
                            setCardCalMonth(m);
                            setCardCalYear(y);
                          }}
                          onNextMonth={() => {
                            let m = cardCalMonth + 1;
                            let y = cardCalYear;
                            if (m > 11) {
                              m = 0;
                              y += 1;
                            }
                            setCardCalMonth(m);
                            setCardCalYear(y);
                          }}
                        />
                        <button type="button" className={styles.dateSaveBtn} onClick={saveDateEdit}>
                          확인
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={styles.cardMeta}
                      onClick={() => startDateEdit(route)}
                      title="클릭해서 날짜 수정"
                    >
                      {route.dateLabel} · 방문지 {route.places.length}곳
                    </div>
                  )}

                  {route.members && route.members.length > 0 ? (
                    <div className={styles.members}>
                      {route.members.map((name) => (
                        <span key={name} className={styles.member}>
                          <span
                            className={styles.memberAvatar}
                            style={{ background: avatarColorFor(name) }}
                          >
                            {name.slice(0, 1)}
                          </span>
                          <span>{name}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}

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
          <Button size="sm" onClick={() => router.push(newTripHref)}>
            시작하기
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
