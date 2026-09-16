import 'server-only';

import { asc } from 'drizzle-orm';

import { db } from '@/db/client';
import { destinations } from '@/db/schema';

export interface DestinationView {
  id: string;
  name: string;
  region: string;
  badge: string;
  desc: string;
  tags: string[];
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
    });
  }

  return sections;
}
