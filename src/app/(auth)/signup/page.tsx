import type { Metadata } from 'next';
import Link from 'next/link';

import { ROUTES } from '@/constants';

import { AuthForm } from '../AuthForm';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: '회원가입' };

export default function SignupPage() {
  return (
    <>
      <AuthForm mode="signup" />
      <p className={styles.topBar} style={{ justifyContent: 'center', fontSize: 13 }}>
        이미 계정이 있으신가요?&nbsp;<Link href={ROUTES.login}>로그인</Link>
      </p>
    </>
  );
}
