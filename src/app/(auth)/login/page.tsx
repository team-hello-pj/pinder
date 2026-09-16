import type { Metadata } from 'next';

import { LoginClient } from './LoginClient';

export const metadata: Metadata = { title: '로그인' };

export default function LoginPage() {
  return <LoginClient />;
}
