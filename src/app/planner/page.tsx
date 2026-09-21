import type { Metadata } from 'next';
import { Suspense } from 'react';
import { eq, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { schedules } from '@/db/schema';

import { PlannerClient } from './PlannerClient';

const DEFAULT_METADATA: Metadata = { title: '경로 만들기' };

type PlannerPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

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

  const [row] = await db
    .select({ title: schedules.title })
    .from(schedules)
    .where(or(eq(schedules.inviteTokenViewer, invite), eq(schedules.inviteTokenEditor, invite)))
    .limit(1);
  if (!row) {
    return DEFAULT_METADATA;
  }

  const title = role === 'editor' ? `p:nder | ${row.title} 편집` : `p:nder | ${row.title} 보기`;
  const description =
    role === 'editor'
      ? '일정을 편집하고 함께 계획해보세요.'
      : '일정을 확인하고 여행 경로를 따라가보세요.';

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
