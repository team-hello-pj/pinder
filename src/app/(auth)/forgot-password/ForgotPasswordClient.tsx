'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ROUTES } from '@/constants';
import { verifyCode } from '@/lib/email-verification';
import { confirmPasswordReset, sendPasswordResetCode } from '@/lib/password-reset';
import { useSession } from '@/components/providers/SessionProvider';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

import styles from './forgot-password.module.css';

type Step = 'email' | 'code' | 'password' | 'done';

/** legacy에 없는 화면이라 새로 만들었다 — 로그인/회원가입과 같은 카드 톤으로 구성. */
export function ForgotPasswordClient() {
  const router = useRouter();
  const { login } = useSession();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sending, setSending] = useState(false);

  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendSecLeft, setResendSecLeft] = useState(0);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    },
    [],
  );

  const startTimers = (cooldownSec: number, expiresInSec: number) => {
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);

    setResendDisabled(true);
    setResendSecLeft(cooldownSec);
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
      setCodeMsg('인증번호가 만료되었습니다. 다시 받아주세요.');
      setCodeError(true);
    }, expiresInSec * 1000);
  };

  const handleSendCode = async () => {
    if (!email || sending) return;
    setEmailError('');
    setSending(true);
    try {
      const res = await sendPasswordResetCode(email);
      setStep('code');
      setCode('');
      setCodeError(false);
      setCodeMsg(
        `인증번호가 발송되었습니다. ${Math.floor(res.expiresInSec / 60)}분 안에 입력해주세요.`,
      );
      startTimers(res.cooldownSec, res.expiresInSec);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : '인증번호 발송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) return;
    const res = await verifyCode(email, code);
    if (res.ok) {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
      setStep('password');
      return;
    }
    const msg =
      res.reason === 'expired'
        ? '인증번호가 만료되었습니다. 다시 받아주세요.'
        : res.reason === 'too_many_attempts'
          ? '시도 횟수를 초과했습니다. 다시 받아주세요.'
          : '인증번호가 올바르지 않습니다.';
    setCodeMsg(msg);
    setCodeError(true);
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setPasswordError('비밀번호는 8자 이상 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setPasswordError('');
    setSubmitting(true);
    const result = await confirmPasswordReset(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setPasswordError(result.message);
      return;
    }
    login(result.user);
    setStep('done');
    setTimeout(() => router.push(ROUTES.home), 1200);
  };

  return (
    <div className={styles.card}>
      <div className={styles.topBar}>
        <ThemeToggle />
      </div>

      <div className={styles.brandBlock}>
        <Logo href={ROUTES.home} size="lg" />
        <p className={styles.tagline}>비밀번호를 재설정해요</p>
      </div>

      {step === 'email' ? (
        <div className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>이메일</span>
            <div
              className={
                emailError ? `${styles.inputRow} ${styles.inputRowError}` : styles.inputRow
              }
            >
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                className={styles.input}
              />
            </div>
            {emailError ? <span className={styles.errorText}>{emailError}</span> : null}
          </label>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSendCode}
            disabled={!email || sending}
          >
            {sending ? '발송 중...' : '인증번호 받기'}
          </button>
        </div>
      ) : null}

      {step === 'code' ? (
        <div className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>인증번호</span>
            <div className={styles.fieldWithBtn}>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6자리 숫자"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ''));
                    setCodeError(false);
                  }}
                  className={styles.input}
                />
              </div>
              <button type="button" className={styles.checkBtn} onClick={handleVerifyCode}>
                인증하기
              </button>
            </div>
            {codeMsg ? (
              <span className={codeError ? styles.errorText : styles.hintText}>{codeMsg}</span>
            ) : null}
          </label>
          <button
            type="button"
            className={styles.resendLink}
            onClick={handleSendCode}
            disabled={resendDisabled}
          >
            {resendDisabled ? `인증번호 재전송 (${resendSecLeft}s)` : '인증번호 재전송'}
          </button>
        </div>
      ) : null}

      {step === 'password' ? (
        <form className={styles.form} onSubmit={handleSubmitPassword} noValidate>
          <span className={styles.statusTextOk}>✓ 이메일 인증이 완료되었습니다.</span>
          <label className={styles.field}>
            <span className={styles.label}>새 비밀번호</span>
            <div className={styles.inputRow}>
              <input
                type="password"
                placeholder="8자 이상 입력해주세요"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                className={styles.input}
              />
            </div>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>새 비밀번호 확인</span>
            <div className={styles.inputRow}>
              <input
                type="password"
                placeholder="다시 입력해주세요"
                value={passwordConfirm}
                onChange={(e) => {
                  setPasswordConfirm(e.target.value);
                  setPasswordError('');
                }}
                className={styles.input}
              />
            </div>
          </label>
          {passwordError ? <span className={styles.errorText}>{passwordError}</span> : null}
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      ) : null}

      {step === 'done' ? (
        <p className={styles.statusTextOk}>✓ 비밀번호가 변경되었습니다. 잠시 후 이동할게요.</p>
      ) : null}

      <p className={styles.footerText}>
        <Link href={ROUTES.login}>로그인으로 돌아가기</Link>
      </p>
    </div>
  );
}
