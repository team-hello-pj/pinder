import 'server-only';

import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { destinations } from '@/db/schema';
import type { Place, TransportMode } from '@/types';

export type DestinationTripLength = 1 | 2 | 3;

interface DestinationRouteVariant {
  places: Place[];
  segments: TransportMode[];
}

type StoredRoutes = Partial<Record<'1' | '2' | '3', DestinationRouteVariant>>;

export interface DestinationView {
  id: string;
  name: string;
  region: string;
  badge: string;
  desc: string;
  tags: string[];
  /** 카드에 보여줄 사진 경로. 없으면 화면에서 자리표시자를 보여준다. */
  imageUrl: string | null;
  /** 우리 AI 동선 생성 기능으로 미리 만들어 둔 동선이 있는지 — "이 여행지로 일정 짜기" 노출 여부. */
  hasRoute: boolean;
  /**
   * 미리 만들어 둔 기간이 몇 가지인지(1/2/3 중 일부 또는 전부). 하나뿐이면 굳이 "며칠 동안
   * 다녀오시나요?"를 묻지 않고 그 길이로 바로 시작한다 — 예: 드라이브 코스는 당일치기만 있다.
   */
  availableTripLengths: DestinationTripLength[];
}

export interface ExploreSectionView {
  title: string;
  subtitle: string;
  items: DestinationView[];
}

export async function listExploreSections(): Promise<ExploreSectionView[]> {
  const rows = await db
    .select()
    .from(destinations)
    .orderBy(asc(destinations.sectionOrder), asc(destinations.itemOrder));

  const sections: ExploreSectionView[] = [];
  const sectionByTitle = new Map<string, ExploreSectionView>();

  for (const row of rows) {
    let section = sectionByTitle.get(row.sectionTitle);
    if (!section) {
      section = { title: row.sectionTitle, subtitle: row.sectionSubtitle, items: [] };
      sectionByTitle.set(row.sectionTitle, section);
      sections.push(section);
    }
    const routes = row.routes as StoredRoutes | null;
    const availableTripLengths = ([1, 2, 3] as DestinationTripLength[]).filter((len) => {
      const variant = routes?.[String(len) as '1' | '2' | '3'];
      return Boolean(variant?.places?.length);
    });
    section.items.push({
      id: row.id,
      name: row.name,
      region: row.region,
      badge: row.badge,
      desc: row.desc,
      tags: row.tags as string[],
      imageUrl: row.imageUrl,
      hasRoute: availableTripLengths.length > 0,
      availableTripLengths,
    });
  }

  return sections;
}

/**
 * "이 여행지로 일정 짜기"에서 쓸, 미리 만들어 둔 동선을 돌려준다 — 당일치기(1)/1박2일(2)/
 * 2박3일(3) 중 고른 길이에 맞는 것 하나. 그 길이로 만들어 둔 게 없으면 null.
 */
export async function getDestinationRoute(
  id: string,
  tripLength: DestinationTripLength,
): Promise<DestinationRouteVariant | null> {
  const [row] = await db
    .select({ routes: destinations.routes })
    .from(destinations)
    .where(eq(destinations.id, id))
    .limit(1);
  const routes = row?.routes as StoredRoutes | null | undefined;
  const variant = routes?.[String(tripLength) as '1' | '2' | '3'];
  if (!variant || !Array.isArray(variant.places) || variant.places.length === 0) return null;
  return { places: variant.places, segments: variant.segments ?? [] };
}
