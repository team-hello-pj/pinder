'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ROUTES } from '@/constants';
import { loginUser, registerUser } from '@/lib/auth';
import { useSession } from '@/components/providers/SessionProvider';
import { Button } from '@/components/ui';

import styles from './AuthForm.module.css';

export interface AuthFormProps {
  mode: 'login' | 'signup';
}

const COPY = {
  login: { title: '로그인', submit: '로그인' },
  signup: { title: '회원가입', submit: '가입하기' },
} as const;

/**
 * 로그인 / 회원가입 공용 폼.
 *
 * 실제 백엔드는 없고 localStorage 기반 목업 인증(lib/auth.ts)으로 동작한다 —
 * 회원가입하면 계정이 저장되고, 그 계정으로 로그인하면 세션이 시작돼 홈으로 이동한다.
 * TODO(인증 담당): 실제 백엔드/NextAuth 연동 시 lib/auth.ts 의 두 함수만 API 호출로 교체.
 */
export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);

  const copy = COPY[mode];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('이메일 주소를 확인해주세요.');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (mode === 'signup' && nickname.trim().length < 2) {
      setError('닉네임은 2자 이상 입력해주세요.');
      return;
    }

    const result =
      mode === 'signup'
        ? registerUser(email, nickname.trim(), password)
        : loginUser(email, password);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError(null);
    login();
    router.push(ROUTES.home);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>{copy.title}</h1>

      <label className={styles.field}>
        <span className={styles.label}>이메일</span>
        <input
          className={styles.input}
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      {mode === 'signup' ? (
        <label className={styles.field}>
          <span className={styles.label}>닉네임</span>
          <input
            className={styles.input}
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="여행러"
          />
        </label>
      ) : null}

      <label className={styles.field}>
        <span className={styles.label}>비밀번호</span>
        <input
          className={styles.input}
          type="password"
          value={password}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8자 이상"
        />
      </label>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth>
        {copy.submit}
      </Button>
    </form>
  );
}
