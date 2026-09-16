'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { deleteAccount, type CreatorScheduleSummary } from '@/lib/account';
import { checkNickname, updateNickname, type NicknameCheckResult } from '@/lib/nickname';
import { getNotificationPrefs, updateNotificationPrefs } from '@/lib/notifications';
import { useSession } from '@/components/providers/SessionProvider';
import { Button, Modal } from '@/components/ui';

import { DEFAULT_NOTIFICATION_PREFS, NOTIFICATION_DEFS, TERMS_SECTIONS } from './data';
import styles from './my-page.module.css';

type WithdrawStep = 'confirm' | 'blocked' | 'finalWarning' | 'finalLoading' | 'loading' | 'success';

interface NicknameCheckState extends NicknameCheckResult {
  forValue: string;
}

/** legacy/My Page.dc.html 을 그대로 이식. 헤더는 (main) 레이아웃의 공용 SiteHeader 가 담당한다. */
export function MyPageClient() {
  const router = useRouter();
  const { user, logout, updateUser } = useSession();
  const nickname = user?.nickname || user?.name || '';
  const email = user?.email ?? '';
  const [logoutOpen, setLogoutOpen] = useState(false);

  const [editNicknameOpen, setEditNicknameOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameCheck, setNicknameCheck] = useState<NicknameCheckState | null>(null);
  const [nicknameSavedToast, setNicknameSavedToast] = useState(false);

  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATION_PREFS);

  const [termsOpen, setTermsOpen] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<WithdrawStep>('confirm');
  const [withdrawError, setWithdrawError] = useState(false);
  const [withdrawAgreeChecked, setWithdrawAgreeChecked] = useState(false);
  const [blockedAgreeChecked, setBlockedAgreeChecked] = useState(false);
  const [finalWarningAgreeChecked, setFinalWarningAgreeChecked] = useState(false);
  const [creatorSchedules, setCreatorSchedules] = useState<CreatorScheduleSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    getNotificationPrefs().then((prefs) => {
      if (!cancelled && prefs) setNotifications(prefs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- 닉네임 수정 ----
  const openEditNickname = () => {
    setNicknameDraft(nickname);
    setNicknameCheck(null);
    setEditNicknameOpen(true);
  };
  const closeEditNickname = () => setEditNicknameOpen(false);
  const onNicknameDraftChange = (value: string) => {
    setNicknameDraft(value);
    setNicknameCheck(null); // 입력이 바뀌면 이전 중복확인 결과는 무효화
  };
  const onCheckNickname = async () => {
    const draft = nicknameDraft.trim();
    setNicknameChecking(true);
    const result = await checkNickname(draft);
    setNicknameChecking(false);
    setNicknameCheck({ forValue: draft, ...result });
  };
  const canSaveNickname =
    nicknameCheck !== null &&
    nicknameCheck.forValue === nicknameDraft.trim() &&
    nicknameCheck.available;
  const onSaveNickname = async () => {
    if (!canSaveNickname) return;
    const draft = nicknameDraft.trim();
    const result = await updateNickname(draft);
    if (!result.ok) {
      setNicknameCheck({
        forValue: draft,
        available: false,
        reason: 'taken',
        message: result.message,
      });
      return;
    }
    updateUser({ nickname: result.nickname });
    setEditNicknameOpen(false);
    setNicknameSavedToast(true);
    setTimeout(() => setNicknameSavedToast(false), 2200);
  };

  // ---- 알림 설정 ----
  const toggleNotification = (key: string) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      updateNotificationPrefs(next);
      return next;
    });
  };

  // ---- 로그아웃 ----
  // 로그아웃은 로그인 상태만 정리한다 — '아이디 저장'(pd-saved-id)은 로그인 페이지 기능이라 건드리지 않는다.
  const onConfirmLogout = async () => {
    await logout();
    router.push('/login');
  };

  // ---- 회원 탈퇴 ----
  const openWithdraw = () => {
    setWithdrawStep('confirm');
    setWithdrawError(false);
    setWithdrawAgreeChecked(false);
    setBlockedAgreeChecked(false);
    setWithdrawOpen(true);
  };
  const closeWithdraw = () => setWithdrawOpen(false);

  const onConfirmWithdraw = async () => {
    if (!withdrawAgreeChecked) return;
    setWithdrawStep('loading');
    setWithdrawError(false);
    const result = await deleteAccount();
    if (!result.ok && result.reason === 'has_creator_schedules') {
      setCreatorSchedules(result.creatorSchedules);
      setWithdrawStep('blocked');
      return;
    }
    if (!result.ok) {
      setWithdrawStep('confirm');
      setWithdrawError(true);
      return;
    }
    await logout();
    setWithdrawStep('success');
    setTimeout(() => {
      router.push('/login');
    }, 1400);
  };

  const onConfirmBlocked = () => {
    if (!blockedAgreeChecked) return;
    setFinalWarningAgreeChecked(false);
    setWithdrawStep('finalWarning');
  };

  const onConfirmFinalWarning = async () => {
    if (!finalWarningAgreeChecked) return;
    setWithdrawStep('finalLoading');
    setWithdrawError(false);
    const result = await deleteAccount({ force: true });
    if (!result.ok) {
      setWithdrawStep('finalWarning');
      setWithdrawError(true);
      return;
    }
    await logout();
    setWithdrawStep('success');
    setTimeout(() => {
      router.push('/login');
    }, 1400);
  };

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <h1 className={styles.title}>마이페이지</h1>
        <p className={styles.subtitle}>내 계정과 서비스 설정을 관리해요</p>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 목업 아바타 */}
          <img src="/icons/mypage-default-avatar.png" alt="" className={styles.avatarImg} />
          <button
            type="button"
            className={styles.avatarEditBtn}
            aria-label="프로필 사진 변경"
            title="프로필 사진 변경"
          >
            ✎
          </button>
        </div>
        <div className={styles.profileInfo}>
          <div className={styles.profileName}>{nickname}</div>
          <div className={styles.profileEmail}>{email}</div>
        </div>
      </div>

      <p className={styles.sectionLabel}>계정 설정</p>
      <div className={styles.settingsGroup}>
        <button type="button" className={styles.settingsRow} onClick={openEditNickname}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>닉네임</span>
            <span className={styles.rowValue}>{nickname}</span>
          </span>
          <span className={styles.chevron}>›</span>
        </button>
        <div className={styles.settingsRow}>
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>이메일</span>
            <span className={styles.rowValue}>{email}</span>
          </span>
        </div>
      </div>

      <p className={styles.sectionLabel}>서비스 설정</p>
      <div className={styles.settingsGroup}>
        <button
          type="button"
          className={styles.settingsRow}
          onClick={() => setNotificationSettingsOpen(true)}
        >
          <span className={styles.rowValue}>알림 설정</span>
          <span className={styles.chevron}>›</span>
        </button>
        <button type="button" className={styles.settingsRow} onClick={() => setTermsOpen(true)}>
          <span className={styles.rowValue}>약관 및 개인정보</span>
          <span className={styles.chevron}>›</span>
        </button>
      </div>

      <p className={styles.sectionLabel}>계정 관리</p>
      <button type="button" className={styles.logoutCard} onClick={() => setLogoutOpen(true)}>
        로그아웃
      </button>
      <button type="button" className={styles.withdrawCard} onClick={openWithdraw}>
        회원 탈퇴
      </button>

      {/* 닉네임 수정 */}
      <Modal open={editNicknameOpen} title="닉네임 수정" onClose={closeEditNickname}>
        <div className={styles.modalField}>
          <span className={styles.modalLabel}>닉네임</span>
          <div className={styles.nicknameRow}>
            <input
              value={nicknameDraft}
              onChange={(e) => onNicknameDraftChange(e.target.value)}
              maxLength={12}
              className={styles.nicknameInput}
            />
            <button type="button" className={styles.checkBtn} onClick={onCheckNickname}>
              {nicknameChecking
                ? '확인 중...'
                : nicknameCheck?.forValue === nicknameDraft.trim() && nicknameCheck.reason === 'ok'
                  ? '사용 가능'
                  : '중복 확인'}
            </button>
          </div>
          {nicknameCheck && nicknameCheck.forValue === nicknameDraft.trim() ? (
            <p className={nicknameCheck.reason === 'ok' ? styles.checkMsgOk : styles.checkMsgError}>
              {nicknameCheck.reason === 'same_as_current' ? <b>✕ </b> : null}
              {nicknameCheck.message}
            </p>
          ) : null}
        </div>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={closeEditNickname}>
            취소
          </Button>
          <Button size="sm" onClick={onSaveNickname} disabled={!canSaveNickname}>
            저장
          </Button>
        </div>
      </Modal>

      {/* 알림 설정 */}
      <Modal
        open={notificationSettingsOpen}
        title="알림 설정"
        onClose={() => setNotificationSettingsOpen(false)}
      >
        <div className={styles.notifList}>
          {NOTIFICATION_DEFS.map((def) => {
            const on = notifications[def.key];
            return (
              <div key={def.key} className={styles.notifRow}>
                <div className={styles.notifText}>
                  <div className={styles.notifTitle}>
                    {def.emoji} {def.title}
                  </div>
                  <div className={styles.notifDesc}>{def.desc}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  className={on ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}
                  onClick={() => toggleNotification(def.key)}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
            );
          })}
        </div>
        <div className={styles.modalActionsEnd}>
          <Button size="sm" onClick={() => setNotificationSettingsOpen(false)}>
            확인
          </Button>
        </div>
      </Modal>

      {/* 약관 및 개인정보 */}
      <Modal open={termsOpen} title="약관 및 개인정보" onClose={() => setTermsOpen(false)}>
        <div className={styles.termsBody}>
          {TERMS_SECTIONS.map((tm) => (
            <div key={tm.title} className={styles.termsSection}>
              <p className={styles.termsTitle}>{tm.title}</p>
              <p className={styles.termsText}>{tm.body}</p>
            </div>
          ))}
        </div>
        <div className={styles.modalActionsEnd}>
          <Button size="sm" onClick={() => setTermsOpen(false)}>
            확인
          </Button>
        </div>
      </Modal>

      {/* 로그아웃 */}
      <Modal open={logoutOpen} title="로그아웃" onClose={() => setLogoutOpen(false)}>
        <p className={styles.modalDesc}>로그아웃하시겠어요?</p>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setLogoutOpen(false)}>
            취소
          </Button>
          <Button size="sm" onClick={onConfirmLogout}>
            로그아웃
          </Button>
        </div>
      </Modal>

      {/* 회원 탈퇴 */}
      <Modal
        open={withdrawOpen}
        title={
          withdrawStep === 'blocked'
            ? '탈퇴하기 전에 확인해주세요'
            : withdrawStep === 'finalWarning' || withdrawStep === 'finalLoading'
              ? '정말로 탈퇴하시겠어요?'
              : withdrawStep === 'success'
                ? '회원 탈퇴가 완료되었습니다'
                : '정말 탈퇴하시겠어요?'
        }
        onClose={closeWithdraw}
      >
        {withdrawStep === 'blocked' ? (
          <>
            <p className={styles.withdrawText}>현재 제작자(Creator)인 일정이 있습니다.</p>
            <p className={styles.withdrawSubText}>
              제작자인 일정은 회원 탈퇴 전에 일정 삭제 또는 소유권 이전 등의 처리가 필요해요. 다른
              참여자에게 영향을 줄 수 있어 탈퇴를 진행할 수 없어요.
            </p>
            <div className={styles.scheduleList}>
              {creatorSchedules.map((sc) => (
                <div key={sc.id} className={styles.scheduleItem}>
                  {sc.title}
                </div>
              ))}
            </div>
            <label className={styles.agreeRow}>
              <input
                type="checkbox"
                checked={blockedAgreeChecked}
                onChange={() => setBlockedAgreeChecked((v) => !v)}
              />
              <span>일정 삭제 및 소유권 이전 처리 등에 동의합니다.</span>
            </label>
            <div className={styles.modalActions}>
              <Button variant="secondary" size="sm" onClick={closeWithdraw}>
                취소
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={onConfirmBlocked}
                disabled={!blockedAgreeChecked}
              >
                확인
              </Button>
            </div>
          </>
        ) : withdrawStep === 'finalWarning' || withdrawStep === 'finalLoading' ? (
          <>
            <p className={styles.withdrawWarning}>
              회원 탈퇴 시 모든 일정, 기록들은 소멸되며,
              <br />
              계정 정보는 복구가 불가능합니다.
              <br />
              정말로 탈퇴하시겠어요?
            </p>
            <label className={styles.agreeRow}>
              <input
                type="checkbox"
                checked={finalWarningAgreeChecked}
                onChange={() => setFinalWarningAgreeChecked((v) => !v)}
              />
              <span>내용을 확인했으며 이에 동의합니다.</span>
            </label>
            {withdrawError ? (
              <p className={styles.errorBanner}>
                회원 탈퇴에 실패했어요. 잠시 후 다시 시도해주세요.
              </p>
            ) : null}
            <div className={styles.modalActions}>
              <Button variant="secondary" size="sm" onClick={closeWithdraw}>
                계속 사용할래요.
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={onConfirmFinalWarning}
                disabled={!finalWarningAgreeChecked || withdrawStep === 'finalLoading'}
              >
                {withdrawStep === 'finalLoading' ? '탈퇴 처리 중...' : '네, 탈퇴할게요.'}
              </Button>
            </div>
          </>
        ) : withdrawStep === 'success' ? (
          <p className={styles.withdrawSubText}>로그인 화면으로 이동할게요.</p>
        ) : (
          <>
            <p className={styles.withdrawText}>
              탈퇴하면 계정과 관련된 정보가 삭제되거나 서비스 이용이 제한될 수 있습니다.
            </p>
            <label className={styles.agreeRow}>
              <input
                type="checkbox"
                checked={withdrawAgreeChecked}
                onChange={() => setWithdrawAgreeChecked((v) => !v)}
              />
              <span>회원 탈퇴에 동의합니다.</span>
            </label>
            {withdrawError ? (
              <p className={styles.errorBanner}>
                회원 탈퇴에 실패했어요. 잠시 후 다시 시도해주세요.
              </p>
            ) : null}
            <div className={styles.modalActions}>
              <Button variant="secondary" size="sm" onClick={closeWithdraw}>
                뒤로가기
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={onConfirmWithdraw}
                disabled={!withdrawAgreeChecked || withdrawStep === 'loading'}
              >
                {withdrawStep === 'loading' ? '탈퇴 처리 중...' : '회원 탈퇴'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {nicknameSavedToast ? <div className={styles.toast}>✓ 닉네임이 변경되었어요.</div> : null}
    </div>
  );
}
