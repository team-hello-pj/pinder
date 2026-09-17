import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CommunityClient } from './CommunityClient';

export const metadata: Metadata = { title: '커뮤니티' };

export default function CommunityPage() {
  // CommunityClient 가 알림 클릭으로 들어온 ?post= 를 읽기 위해 useSearchParams()를 쓰므로
  // Suspense 경계가 필요하다 (src/app/planner/page.tsx 와 동일한 이유).
  return (
    <Suspense fallback={null}>
      <CommunityClient />
    </Suspense>
  );
}
