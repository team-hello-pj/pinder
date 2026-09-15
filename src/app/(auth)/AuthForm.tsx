'use client';

import { useState } from 'react';

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
 * TODO(인증 담당): 현재는 폼 검증까지만 동작하고 실제 인증은 붙어 있지 않다.
 * 레거시는 localStorage(`pnder-users`, `pd-session`)로 흉내만 냈으므로,
 * 백엔드 또는 NextAuth 를 붙일 때 handleSubmit 안쪽만 교체하면 된다.
 */
export function AuthForm({ mode }: AuthFormProps) {
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
    setError(null);
    // TODO(인증 담당): 여기서 인증 API 를 호출한다.
    setError('인증 연동은 아직 구현되지 않았습니다. docs/TEAM.md 의 담당자를 확인하세요.');
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
