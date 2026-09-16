import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SignupClient } from './SignupClient';

export const metadata: Metadata = { title: '회원가입' };

export default function SignupPage() {
  // SignupClient 는 구글 로그인에서 넘어올 때 useSearchParams(email, name, googleVerified)를 쓰므로
  // Suspense 경계가 필요하다.
  return (
    <Suspense fallback={null}>
      <SignupClient />
    </Suspense>
  );
}
