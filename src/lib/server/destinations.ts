import 'server-only';

import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { destinations } from '@/db/schema';
import type { Place, TransportMode } from '@/types';

export interface DestinationView {
  id: string;
  name: string;
  region: string;
  badge: string;
  desc: string;
  tags: string[];
  /** 우리 AI 동선 생성 기능으로 미리 만들어 둔 동선이 있는지 — "이 여행지로 일정 짜기" 노출 여부. */
  hasRoute: boolean;
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
    section.items.push({
      id: row.id,
      name: row.name,
      region: row.region,
      badge: row.badge,
      desc: row.desc,
      tags: row.tags as string[],
      hasRoute: Array.isArray(row.places) && row.places.length > 0,
    });
  }

  return sections;
}

/** "이 여행지로 일정 짜기"에서 쓸, 미리 만들어 둔 동선을 그대로 돌려준다. 없으면 null. */
export async function getDestinationRoute(
  id: string,
): Promise<{ places: Place[]; segments: TransportMode[] } | null> {
  const [row] = await db
    .select({ places: destinations.places, segments: destinations.segments })
    .from(destinations)
    .where(eq(destinations.id, id))
    .limit(1);
  if (!row || !Array.isArray(row.places) || row.places.length === 0) return null;
  return {
    places: row.places as Place[],
    segments: (row.segments as TransportMode[]) ?? [],
  };
}
