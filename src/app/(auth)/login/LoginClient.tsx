'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ROUTES } from '@/constants';
import { loginUser } from '@/lib/auth';
import { renderGoogleLoginButton } from '@/lib/google-auth';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import { useSession } from '@/components/providers/SessionProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

import styles from './login.module.css';

/** legacy/Login Screen.dc.html 을 그대로 이식. Google 로그인은 실제 Identity Services 로 동작한다. */
export function LoginClient() {
  const router = useRouter();
  const { login } = useSession();
  const { isDark } = useTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saveId, setSaveId] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [googleUserLabel, setGoogleUserLabel] = useState('');
  const googleSlotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // localStorage 는 클라이언트에만 있어 서버 렌더와 맞출 수 없으므로 마운트 후 한 번만 반영한다.
    const saved = storage.read<string>(STORAGE_KEYS.savedId, '');
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIdentifier(saved);
      setSaveId(true);
    }
  }, []);

  useEffect(() => {
    if (!googleSlotRef.current) return;
    // 테마가 바뀌면(라이트<->다크) 구글 버튼도 그에 맞는 테마로 다시 그려야 한다 — 이미 그려진
    // 버튼은 그대로 남아있으므로 비우고 다시 렌더링한다.
    googleSlotRef.current.innerHTML = '';
    renderGoogleLoginButton(
      googleSlotRef.current,
      (user) => {
        setGoogleError('');
        setGoogleUserLabel(user.nickname ?? user.name ?? user.email);
        login(user);
        setTimeout(() => router.push(ROUTES.home), 500);
      },
      (message) => setGoogleError(message),
      ({ email, name }) => {
        const params = new URLSearchParams({ email, name, googleVerified: '1' });
        router.push(`${ROUTES.signup}?${params.toString()}`);
      },
      isDark ? 'dark' : 'light',
    );
  }, [isDark, login, router]);

  const onIdentifierChange = (value: string) => {
    setIdentifier(value);
    setError('');
    if (saveId) storage.write(STORAGE_KEYS.savedId, value);
  };
  const onToggleSaveId = (checked: boolean) => {
    setSaveId(checked);
    if (checked) storage.write(STORAGE_KEYS.savedId, identifier);
    else storage.write(STORAGE_KEYS.savedId, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }
    const result = await loginUser(identifier, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError('');
    login(result.user);
    router.push(ROUTES.home);
  };

  return (
    <div className={styles.card}>
      <div className={styles.topBar}>
        <Link href={ROUTES.home} title="홈으로" className={styles.homeBtn}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
          </svg>
        </Link>
        <ThemeToggle />
      </div>

      <div className={styles.brandBlock}>
        <Logo href={ROUTES.home} size="lg" />
        <p className={styles.tagline}>로그인하고 최적의 동선을 만들어보세요</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.field}>
          <span className={styles.label}>아이디</span>
          <div className={error ? `${styles.inputRow} ${styles.inputRowError}` : styles.inputRow}>
            <span className={styles.inputIconSlot} aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element -- 지정된 정적 아이콘 그대로 사용, CSS로만 확대/크롭 */}
              <img src="/icons/ant.png" alt="" className={styles.inputIconAntImg} />
            </span>
            <input
              type="text"
              placeholder="아이디를 입력하세요"
              value={identifier}
              onChange={(e) => onIdentifierChange(e.target.value)}
              className={`${styles.input} ${styles.inputWithImgIcon}`}
            />
          </div>
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
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className={styles.input}
            />
          </div>
        </label>

        {error ? (
          <span className={styles.errorText} role="alert">
            {error}
          </span>
        ) : null}

        <div className={styles.rowBetween}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={saveId}
              onChange={(e) => onToggleSaveId(e.target.checked)}
            />
            <span>아이디 저장</span>
          </label>
          <Link href={ROUTES.forgotPassword} className={styles.forgotLink}>
            비밀번호를 잊으셨나요?
          </Link>
        </div>

        <button type="submit" className={styles.submitBtn}>
          로그인
        </button>
      </form>

      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>또는</span>
        <span className={styles.dividerLine} />
      </div>

      <div className={styles.googleSection}>
        {/* 구글이 그리는 실제 버튼(iframe)은 어떤 theme/width를 넘겨도 주위에 자체 흰 여백이
            남는 경우가 있어 다크모드에서 완전히 지울 수가 없다 — 그래서 보이는 버튼은 우리
            디자인대로 직접 그리고, 실제 구글 버튼은 그 위에 거의 투명하게 겹쳐서 클릭만
            받도록 한다. */}
        <div className={styles.googleBtnWrap}>
          <div className={styles.googleBtnVisual} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element -- 18px 정적 아이콘 */}
            <img src="/icons/google-g-logo.png" alt="" className={styles.googleGIcon} />
            <span>Google로 계속하기</span>
          </div>
          <div ref={googleSlotRef} className={styles.googleSlotOverlay} />
        </div>
        {googleError ? <p className={styles.googleNoticeError}>{googleError}</p> : null}
        {googleUserLabel ? (
          <div className={styles.googleSuccess}>
            <span className={styles.googleSuccessAvatar}>{googleUserLabel.slice(0, 1)}</span>
            <span>{googleUserLabel}(으)로 로그인되었습니다</span>
          </div>
        ) : null}
      </div>

      <p className={styles.footerText}>
        아직 계정이 없으신가요? <Link href={ROUTES.signup}>회원가입</Link>
      </p>
    </div>
  );
}
