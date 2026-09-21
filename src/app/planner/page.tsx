import type { Metadata } from 'next';
import { Suspense } from 'react';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { schedules } from '@/db/schema';

import { PlannerClient } from './PlannerClient';

const DEFAULT_METADATA: Metadata = { title: '경로 만들기' };

type PlannerPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// searchParams(invite/role)에 따라 매 요청마다 일정 제목을 새로 읽어야 하므로, 이 라우트가
// 정적으로 프리렌더되거나 캐시되지 않도록 강제한다 — 그러지 않으면 일정 제목을 수정해도
// 공유 링크 미리보기에는 예전 제목이 계속 보일 수 있다.
export const dynamic = 'force-dynamic';

/**
 * 일반 진입(/planner, /planner?new=1 등)은 기본 메타데이터를 그대로 쓴다.
 * 초대 링크(?invite=<token>&role=editor|viewer)로 들어온 경우에만, 그 일정의 실제 제목을
 * 읽어와 편집/보기 링크용 제목·설명으로 바꿔치기한다 — og:image는 루트 레이아웃의
 * /og-image.png를 그대로 상속해 쓰므로 여기서 따로 지정하지 않으면 사라지기 때문에
 * openGraph/twitter에도 명시적으로 함께 넣어준다.
 */
export async function generateMetadata({ searchParams }: PlannerPageProps): Promise<Metadata> {
  const params = await searchParams;
  const invite = typeof params.invite === 'string' ? params.invite : undefined;
  const role = typeof params.role === 'string' ? params.role : undefined;
  if (!invite || (role !== 'editor' && role !== 'viewer')) {
    return DEFAULT_METADATA;
  }

  // role별로 실제 초대 토큰이 저장되는 컬럼이 다르므로, 그 role에 해당하는 컬럼만 정확히
  // 조회한다 — editor 조건과 viewer 조건이 하나의 OR 조건으로 뒤섞이지 않게 하기 위함이다.
  const tokenColumn = role === 'editor' ? schedules.inviteTokenEditor : schedules.inviteTokenViewer;
  const [row] = await db
    .select({ id: schedules.id, title: schedules.title })
    .from(schedules)
    .where(eq(tokenColumn, invite))
    .limit(1);
  if (!row) {
    return DEFAULT_METADATA;
  }

  let title: string;
  let description: string;
  if (role === 'editor') {
    title = `'${row.title}' 일정 편집`;
    description = '일정을 편집하고 함께 계획해보세요.';
  } else {
    title = `'${row.title}' 일정 보기`;
    description = '일정을 확인하고 여행 경로를 따라가보세요.';
  }

  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, images: ['/og-image.png'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
  };
}

export default function PlannerPage() {
  // PlannerClient 는 useSearchParams(new, tripStart, tripEnd, destination, loadRoute)를 쓰므로
  // Suspense 경계가 필요하다.
  return (
    <Suspense fallback={null}>
      <PlannerClient />
    </Suspense>
  );
}
