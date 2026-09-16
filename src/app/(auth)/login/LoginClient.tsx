'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ROUTES } from '@/constants';
import { loginUser } from '@/lib/auth';
import { renderGoogleLoginButton } from '@/lib/google-auth';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import { useSession } from '@/components/providers/SessionProvider';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

import styles from './login.module.css';

/** legacy/Login Screen.dc.html 을 그대로 이식. Google 로그인은 실제 Identity Services 로 동작한다. */
export function LoginClient() {
  const router = useRouter();
  const { login } = useSession();

  const [email, setEmail] = useState('');
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
      setEmail(saved);
      setSaveId(true);
    }
  }, []);

  useEffect(() => {
    if (!googleSlotRef.current) return;
    renderGoogleLoginButton(
      googleSlotRef.current,
      (user) => {
        setGoogleError('');
        setGoogleUserLabel(user.nickname ?? user.name ?? user.email);
        login(user);
        setTimeout(() => router.push(ROUTES.planner), 500);
      },
      (message) => setGoogleError(message),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 버튼은 마운트 시 한 번만 렌더링한다
  }, []);

  const onEmailChange = (value: string) => {
    setEmail(value);
    setError('');
    if (saveId) storage.write(STORAGE_KEYS.savedId, value);
  };
  const onToggleSaveId = (checked: boolean) => {
    setSaveId(checked);
    if (checked) storage.write(STORAGE_KEYS.savedId, email);
    else storage.write(STORAGE_KEYS.savedId, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    const result = await loginUser(email, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError('');
    login(result.user);
    router.push(ROUTES.planner);
  };

  return (
    <div className={styles.card}>
      <div className={styles.topBar}>
        <ThemeToggle />
      </div>

      <div className={styles.brandBlock}>
        <Logo href={ROUTES.home} size="lg" />
        <p className={styles.tagline}>로그인하고 최적의 동선을 만들어보세요</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.field}>
          <span className={styles.label}>이메일</span>
          <div className={error ? `${styles.inputRow} ${styles.inputRowError}` : styles.inputRow}>
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
              onChange={(e) => onEmailChange(e.target.value)}
              className={styles.input}
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
          <a href="#" className={styles.forgotLink}>
            비밀번호를 잊으셨나요?
          </a>
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
        <div ref={googleSlotRef} className={styles.googleSlot} />
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
