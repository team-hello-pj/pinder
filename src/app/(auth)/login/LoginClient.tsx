'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ROUTES } from '@/constants';
import { loginUser } from '@/lib/auth';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import { useSession } from '@/components/providers/SessionProvider';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

import styles from './login.module.css';

/**
 * legacy/Login Screen.dc.html 을 그대로 이식.
 * Google 로그인은 실제 OAuth 클라이언트 설정이 없어 버튼만 두고, 누르면 안내만 띄운다
 * (레거시도 서버 검증 없이 "로그인 성공 신호"로만 썼던 자리라, 우리도 동일하게 미구현으로 남긴다).
 */
export function LoginClient() {
  const router = useRouter();
  const { login } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saveId, setSaveId] = useState(false);
  const [googleNotice, setGoogleNotice] = useState(false);

  useEffect(() => {
    // localStorage 는 클라이언트에만 있어 서버 렌더와 맞출 수 없으므로 마운트 후 한 번만 반영한다.
    const saved = storage.read<string>(STORAGE_KEYS.savedId, '');
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(saved);
      setSaveId(true);
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    const result = loginUser(email, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError('');
    login();
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
        <button type="button" className={styles.googleBtn} onClick={() => setGoogleNotice(true)}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.7-6.1 8.1-11.3 8.1-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6 4.4C13.9 15.3 18.6 12 24 12c3.1 0 5.9 1.2 8 3.1l5.1-5.1C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.2 4.8C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C40.8 35.7 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"
            />
          </svg>
          Google로 로그인
        </button>
        {googleNotice ? (
          <p className={styles.googleNotice}>Google 로그인은 아직 준비 중이에요.</p>
        ) : null}
      </div>

      <p className={styles.footerText}>
        아직 계정이 없으신가요? <Link href={ROUTES.signup}>회원가입</Link>
      </p>
    </div>
  );
}
