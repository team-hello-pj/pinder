'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ROUTES } from '@/constants';
import { isNicknameTaken, isUsernameTaken, registerUser } from '@/lib/auth';
import { resizeImageFile } from '@/lib/avatar-upload';
import { sendCode, verifyCode } from '@/lib/email-verification';
import { useSession } from '@/components/providers/SessionProvider';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Modal } from '@/components/ui';

import { TERMS_DATA } from './data';
import styles from './signup.module.css';

type FieldStatus = '' | 'checking' | 'available' | 'taken' | 'invalid';

const USERNAME_STATUS_TEXT: Record<Exclude<FieldStatus, ''>, string> = {
  checking: '확인 중...',
  available: '사용 가능한 아이디입니다.',
  taken: '이미 사용 중인 아이디입니다.',
  invalid: '아이디는 4자 이상 입력해주세요.',
};

const NICKNAME_STATUS_TEXT: Record<Exclude<FieldStatus, ''>, string> = {
  checking: '확인 중...',
  available: '사용 가능한 닉네임입니다.',
  taken: '이미 사용 중인 닉네임입니다.',
  invalid: '닉네임은 2자 이상 입력해주세요.',
};

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.3 5.3A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.2 3.1M6.5 6.5A13.4 13.4 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 3.5-.6" />
    </svg>
  );
}

/**
 * 위치정보 이용에 동의한 경우에만 호출 — 권한 프롬프트만 띄워보는 용도라
 * 좌표는 어디에도 저장하지 않고, 거부되거나 실패해도 그냥 무시한다
 * (회원가입/로그인 완료 여부에 전혀 영향 없음).
 */
function requestLocationPermission() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    () => {},
    () => {},
  );
}

/** legacy/Signup Screen.dc.html 을 그대로 이식. */
export function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useSession();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<FieldStatus>('');
  const [nickname, setNickname] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState<FieldStatus>('');

  const [email, setEmail] = useState('');
  const [emailFieldError, setEmailFieldError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [codeStepVisible, setCodeStepVisible] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeMsg, setEmailCodeMsg] = useState('');
  const [emailCodeError, setEmailCodeError] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendSecLeft, setResendSecLeft] = useState(0);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false);

  const [termsChecked, setTermsChecked] = useState({
    service: false,
    privacy: false,
    marketing: false,
    location: false,
  });
  const [termsSectionOpen, setTermsSectionOpen] = useState(false);
  const [termsModalKey, setTermsModalKey] = useState<string | null>(null);

  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [avatarActionsOpen, setAvatarActionsOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [error, setError] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingCodeRef = useRef(false);

  useEffect(
    () => () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    // 구글 로그인에서 넘어온 경우: 이메일/이름을 채워두고 이메일 인증 단계는 건너뛴다.
    // (아이디/별명/비밀번호는 그대로 입력받고 "회원가입"을 눌러야 가입이 완료된다.)
    const qEmail = searchParams.get('email');
    const qName = searchParams.get('name');
    const googleVerified = searchParams.get('googleVerified') === '1';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (qEmail) setEmail(qEmail);
    if (qName) setName(qName);
    if (googleVerified && qEmail) setEmailVerified(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 진입 시 한 번만 반영한다
  }, []);

  const onAvatarEditClick = () => {
    avatarInputRef.current?.click();
  };
  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('이미지 파일만 업로드할 수 있어요.');
      return;
    }
    setAvatarError('');
    setAvatarUploading(true);
    try {
      const resized = await resizeImageFile(file);
      setAvatarDataUrl(resized);
    } catch {
      setAvatarError('이미지를 처리하지 못했어요.');
    } finally {
      setAvatarUploading(false);
    }
  };
  const onAvatarReplace = () => {
    setAvatarError('');
    setAvatarDataUrl(null);
  };

  const checkUsername = async () => {
    if (!username || username.length < 4) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const taken = await isUsernameTaken(username);
    setUsernameStatus(taken ? 'taken' : 'available');
  };

  const checkNickname = async () => {
    if (!nickname || nickname.length < 2) {
      setNicknameStatus('invalid');
      return;
    }
    setNicknameStatus('checking');
    const taken = await isNicknameTaken(nickname);
    setNicknameStatus(taken ? 'taken' : 'available');
  };

  const onEmailChangeRequest = () => {
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    setEmailVerified(false);
    setCodeStepVisible(false);
    setEmailCode('');
    setEmailCodeMsg('');
    setResendDisabled(false);
  };

  const handleSendCode = async () => {
    // resendDisabled state 갱신은 비동기라 클릭을 연타하면 응답이 오기 전까지 여러 번
    // 통과해버린다 — ref로 즉시 잠가서 중복 발송(메일 5통 전송 버그)을 막는다.
    if (!email || resendDisabled || sendingCodeRef.current) return;
    sendingCodeRef.current = true;
    setResendDisabled(true);
    setEmailFieldError('');
    let res;
    try {
      res = await sendCode(email);
    } catch (err) {
      setEmailFieldError(err instanceof Error ? err.message : '인증번호 발송에 실패했습니다.');
      setResendDisabled(false);
      return;
    } finally {
      sendingCodeRef.current = false;
    }
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    setCodeStepVisible(true);
    setEmailCode('');
    setEmailCodeMsg(
      `인증번호가 발송되었습니다. 인증번호는 ${Math.floor(res.expiresInSec / 60)}분 동안 유효합니다.`,
    );
    setEmailCodeError(false);
    setResendDisabled(true);
    setResendSecLeft(res.cooldownSec);

    resendTimerRef.current = setInterval(() => {
      setResendSecLeft((left) => {
        if (left <= 1) {
          if (resendTimerRef.current) clearInterval(resendTimerRef.current);
          setResendDisabled(false);
          return 0;
        }
        return left - 1;
      });
    }, 1000);

    expireTimerRef.current = setTimeout(() => {
      setEmailVerified((verified) => {
        if (!verified) {
          setEmailCodeMsg('인증번호가 만료되었습니다. 인증번호를 다시 받아주세요.');
          setEmailCodeError(true);
        }
        return verified;
      });
    }, res.expiresInSec * 1000);
  };

  const handleVerifyCode = async () => {
    if (!emailCode) return;
    const res = await verifyCode(email, emailCode);
    if (res.ok) {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
      setEmailVerified(true);
      setCodeStepVisible(false);
      setError('');
      return;
    }
    const msg =
      res.reason === 'expired'
        ? '인증번호가 만료되었습니다. 인증번호를 다시 받아주세요.'
        : res.reason === 'too_many_attempts'
          ? '시도 횟수를 초과했습니다. 인증번호를 다시 받아주세요.'
          : '인증번호가 올바르지 않습니다.';
    setEmailCodeMsg(msg);
    setEmailCodeError(true);
  };

  const toggleTerm = (key: keyof typeof termsChecked) =>
    setTermsChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  const allTermsChecked = TERMS_DATA.every((t) => termsChecked[t.key]);
  const toggleAllTerms = () => {
    const next = !allTermsChecked;
    setTermsChecked({ service: next, privacy: next, marketing: next, location: next });
  };
  const requiredOk = TERMS_DATA.filter((t) => t.required).every((t) => termsChecked[t.key]);
  const activeTerm = TERMS_DATA.find((t) => t.key === termsModalKey);

  const passwordTooShort = password.length > 0 && password.length < 8;
  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const submitDisabled =
    !requiredOk ||
    !emailVerified ||
    password.length < 8 ||
    password !== passwordConfirm ||
    !nickname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !nickname || !email || !password || !passwordConfirm) {
      setError('모든 항목을 입력해주세요.');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상 입력해주세요.');
      return;
    }
    if (usernameStatus !== 'available') {
      setError('아이디 중복확인을 완료해주세요.');
      return;
    }
    if (!emailVerified) {
      setError('이메일 인증을 완료해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!requiredOk) {
      setError('필수 약관에 동의해주세요.');
      return;
    }

    const result = await registerUser({
      email,
      password,
      username,
      nickname,
      name,
      avatarUrl: avatarDataUrl ?? undefined,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError('');
    if (termsChecked.location) requestLocationPermission();
    login(result.user);
    router.push(ROUTES.home);
  };

  return (
    <div className={styles.card}>
      <div className={styles.topBar}>
        <ThemeToggle />
      </div>

      <div className={styles.brandBlock}>
        <Logo href={ROUTES.home} size="lg" />
        <p className={styles.tagline}>회원가입하고 나만의 여행 동선을 만들어보세요!</p>
      </div>

      <div className={styles.avatarBlock}>
        <div className={styles.avatarSlot}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 사용자가 올린 data URL 이라 next/image 최적화 대상이 아님 */}
          <img
            src={avatarDataUrl || '/icons/mypage-default-avatar.png'}
            alt=""
            className={styles.avatarImg}
          />
          <button
            type="button"
            className={styles.avatarPencil}
            onClick={() => setAvatarActionsOpen((v) => !v)}
            aria-label="프로필 사진 변경"
            disabled={avatarUploading}
          >
            {avatarUploading ? '…' : '✎'}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={onAvatarFileChange}
            hidden
          />
        </div>
        {avatarActionsOpen ? (
          <div className={styles.avatarActions}>
            <button type="button" className={styles.avatarActionBtn} onClick={onAvatarReplace}>
              Replace
            </button>
            <button type="button" className={styles.avatarActionBtn} onClick={onAvatarEditClick}>
              Edit
            </button>
          </div>
        ) : null}
        {avatarError ? <span className={styles.avatarError}>{avatarError}</span> : null}
        <span className={styles.avatarHint}>프로필 사진 (선택)</span>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.field}>
          <span className={styles.label}>이름</span>
          <div className={styles.inputRow}>
            <input
              type="text"
              placeholder="실명을 입력해주세요"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className={styles.input}
            />
          </div>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>아이디</span>
          <div className={styles.fieldWithBtn}>
            <div
              className={
                usernameStatus === 'taken' || usernameStatus === 'invalid'
                  ? `${styles.inputRow} ${styles.inputRowError}`
                  : usernameStatus === 'available'
                    ? `${styles.inputRow} ${styles.inputRowOk}`
                    : styles.inputRow
              }
            >
              <input
                type="text"
                placeholder="영문, 숫자 조합 4~16자"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameStatus('');
                  setError('');
                }}
                className={styles.input}
              />
            </div>
            <button
              type="button"
              className={usernameStatus === 'available' ? styles.checkBtnDone : styles.checkBtn}
              onClick={checkUsername}
              disabled={usernameStatus === 'checking'}
            >
              {usernameStatus === 'available' ? '확인 완료' : '중복확인'}
            </button>
          </div>
          {usernameStatus ? (
            <span
              className={
                usernameStatus === 'available' ? styles.statusTextOk : styles.statusTextError
              }
            >
              {USERNAME_STATUS_TEXT[usernameStatus]}
            </span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>별명</span>
          <div className={styles.fieldWithBtn}>
            <div
              className={
                nicknameStatus === 'taken' || nicknameStatus === 'invalid'
                  ? `${styles.inputRow} ${styles.inputRowError}`
                  : nicknameStatus === 'available'
                    ? `${styles.inputRow} ${styles.inputRowOk}`
                    : styles.inputRow
              }
            >
              <input
                type="text"
                placeholder="다른 여행자에게 보여질 이름이에요"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setNicknameStatus('');
                  setError('');
                }}
                className={styles.input}
              />
            </div>
            <button
              type="button"
              className={nicknameStatus === 'available' ? styles.checkBtnDone : styles.checkBtn}
              onClick={checkNickname}
              disabled={nicknameStatus === 'checking'}
            >
              {nicknameStatus === 'available' ? '확인 완료' : '중복확인'}
            </button>
          </div>
          {nicknameStatus ? (
            <span
              className={
                nicknameStatus === 'available' ? styles.statusTextOk : styles.statusTextError
              }
            >
              {NICKNAME_STATUS_TEXT[nicknameStatus]}
            </span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>이메일</span>
          <div className={styles.fieldWithBtn}>
            <div className={styles.inputRow}>
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                className={styles.inputIcon}
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4 5.5C2.89543 5.5 2 6.39543 2 7.5V16.5C2 17.6046 2.89543 18.5 4 18.5H20C21.1046 18.5 22 17.6046 22 16.5V7.5C22 6.39543 21.1046 5.5 20 5.5H4ZM4.6 7.3L12 12.5L19.4 7.3H4.6Z"
                />
              </svg>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                disabled={emailVerified}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                  setEmailFieldError('');
                }}
                className={styles.input}
              />
            </div>
            {emailVerified ? (
              <button
                type="button"
                className={styles.checkBtnNeutral}
                onClick={onEmailChangeRequest}
              >
                이메일 변경
              </button>
            ) : (
              <button
                type="button"
                className={styles.checkBtn}
                onClick={handleSendCode}
                disabled={!email || resendDisabled}
              >
                {codeStepVisible ? '재전송' : '인증번호 받기'}
              </button>
            )}
          </div>
          {emailVerified ? (
            <span className={styles.statusTextOk}>✓ 이메일 인증이 완료되었습니다.</span>
          ) : null}
          {emailFieldError ? (
            <span className={styles.statusTextError}>{emailFieldError}</span>
          ) : null}
          {codeStepVisible ? (
            <div className={styles.codeBlock}>
              <div className={styles.fieldWithBtn}>
                <div className={styles.inputRow}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="인증번호 6자리"
                    value={emailCode}
                    onChange={(e) => {
                      setEmailCode(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    className={styles.codeInput}
                  />
                </div>
                <button type="button" className={styles.checkBtn} onClick={handleVerifyCode}>
                  인증하기
                </button>
              </div>
              <div className={styles.codeMetaRow}>
                <span className={emailCodeError ? styles.statusTextError : styles.codeMsg}>
                  {emailCodeMsg}
                </span>
                <button
                  type="button"
                  className={styles.resendLink}
                  onClick={handleSendCode}
                  disabled={resendDisabled}
                >
                  {resendDisabled ? `재전송 (${resendSecLeft}s)` : '인증번호 재전송'}
                </button>
              </div>
            </div>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>비밀번호</span>
          <div className={styles.inputRow}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              className={styles.inputIcon}
              aria-hidden
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C9.79086 2 8 3.79086 8 6V9H7C5.89543 9 5 9.89543 5 11V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V11C19 9.89543 18.1046 9 17 9H16V6C16 3.79086 14.2091 2 12 2ZM14 9V6C14 4.89543 13.1046 4 12 4C10.8954 4 10 4.89543 10 6V9H14Z"
              />
            </svg>
            <input
              type={passwordVisible ? 'text' : 'password'}
              placeholder="영문, 숫자, 특수문자 포함 8자 이상"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className={styles.input}
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setPasswordVisible((v) => !v)}
              aria-label={passwordVisible ? '비밀번호 숨기기' : '비밀번호 표시'}
            >
              <EyeIcon open={passwordVisible} />
            </button>
          </div>
          <span className={passwordTooShort ? styles.statusTextError : styles.hintText}>
            {passwordTooShort ? '8자 이상 입력해주세요.' : '영문, 숫자, 특수문자 포함 8자 이상'}
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>비밀번호 확인</span>
          <div
            className={
              passwordMismatch ? `${styles.inputRow} ${styles.inputRowError}` : styles.inputRow
            }
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              className={styles.inputIcon}
              aria-hidden
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C9.79086 2 8 3.79086 8 6V9H7C5.89543 9 5 9.89543 5 11V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V11C19 9.89543 18.1046 9 17 9H16V6C16 3.79086 14.2091 2 12 2ZM14 9V6C14 4.89543 13.1046 4 12 4C10.8954 4 10 4.89543 10 6V9H14Z"
              />
            </svg>
            <input
              type={passwordConfirmVisible ? 'text' : 'password'}
              placeholder="비밀번호를 다시 입력해주세요"
              value={passwordConfirm}
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                setError('');
              }}
              className={styles.input}
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setPasswordConfirmVisible((v) => !v)}
              aria-label={passwordConfirmVisible ? '비밀번호 숨기기' : '비밀번호 표시'}
            >
              <EyeIcon open={passwordConfirmVisible} />
            </button>
          </div>
          {passwordMismatch ? (
            <span className={styles.statusTextError}>비밀번호가 일치하지 않습니다.</span>
          ) : null}
        </label>

        {error ? (
          <span className={styles.errorText} role="alert">
            {error}
          </span>
        ) : null}

        <div className={styles.termsBlock}>
          <div className={styles.termsHead}>
            <button type="button" className={styles.termsAllRow} onClick={toggleAllTerms}>
              <span className={allTermsChecked ? styles.checkbox16Checked : styles.checkbox16}>
                {allTermsChecked ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : null}
              </span>
              <span className={styles.termsAllLabel}>약관 전체 동의</span>
            </button>
            <button
              type="button"
              className={styles.termsToggleBtn}
              onClick={() => setTermsSectionOpen((v) => !v)}
              style={{ transform: termsSectionOpen ? 'rotate(180deg)' : 'none' }}
              aria-label={termsSectionOpen ? '약관 목록 접기' : '약관 목록 펼치기'}
            >
              ⌄
            </button>
          </div>

          {termsSectionOpen ? (
            <div className={styles.termsList}>
              {TERMS_DATA.map((term) => (
                <div key={term.key} className={styles.termsRow}>
                  <button
                    type="button"
                    className={styles.termsRowMain}
                    onClick={() => toggleTerm(term.key)}
                  >
                    <span
                      className={
                        termsChecked[term.key] ? styles.checkbox14Checked : styles.checkbox14
                      }
                    >
                      {termsChecked[term.key] ? (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : null}
                    </span>
                    <span className={styles.termsLabel}>{term.label}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.termsDetailBtn}
                    onClick={() => setTermsModalKey(term.key)}
                    aria-label={`${term.title} 자세히 보기`}
                  >
                    ›
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.termsSummary}>
              {requiredOk ? '필수 약관에 모두 동의했어요' : '필수 약관에 동의해주세요'}
            </p>
          )}
        </div>

        <button type="submit" className={styles.submitBtn} disabled={submitDisabled}>
          회원가입
        </button>
      </form>

      <p className={styles.footerText}>
        이미 계정이 있으신가요? <Link href={ROUTES.login}>로그인</Link>
      </p>

      <Modal
        open={termsModalKey !== null}
        title={activeTerm?.title ?? ''}
        onClose={() => setTermsModalKey(null)}
      >
        <p className={styles.termsModalBody}>{activeTerm?.body}</p>
      </Modal>
    </div>
  );
}
