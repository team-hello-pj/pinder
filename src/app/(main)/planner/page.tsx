import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PlannerClient } from './PlannerClient';

export const metadata: Metadata = { title: '경로 만들기' };

export default function PlannerPage() {
  // PlannerClient 는 useSearchParams(new, tripStart, tripEnd, destination, loadRoute)를 쓰므로
  // Suspense 경계가 필요하다.
  return (
    <Suspense fallback={null}>
      <PlannerClient />
    </Suspense>
  );
}
