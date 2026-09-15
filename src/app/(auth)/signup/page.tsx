import type { Metadata } from 'next';

import { SignupClient } from './SignupClient';

export const metadata: Metadata = { title: '회원가입' };

export default function SignupPage() {
  return <SignupClient />;
}
