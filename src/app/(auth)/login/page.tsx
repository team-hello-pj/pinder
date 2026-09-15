import type { Metadata } from 'next';
import Link from 'next/link';

import { ROUTES } from '@/constants';

import { AuthForm } from '../AuthForm';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: '로그인' };

export default function LoginPage() {
  return (
    <>
      <AuthForm mode="login" />
      <p className={styles.topBar} style={{ justifyContent: 'center', fontSize: 13 }}>
        아직 계정이 없으신가요?&nbsp;<Link href={ROUTES.signup}>회원가입</Link>
      </p>
    </>
  );
}
