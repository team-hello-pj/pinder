'use client';

/** 탐색(Explore) 여행지 API 래퍼 (`/api/explore/destinations`). */

export interface Destination {
  id: string;
  name: string;
  region: string;
  badge: string;
  desc: string;
  tags: string[];
}

export interface ExploreSection {
  title: string;
  subtitle: string;
  items: Destination[];
}

export async function listExploreSections(): Promise<ExploreSection[]> {
  const res = await fetch('/api/explore/destinations');
  const data = await res.json().catch(() => null);
  return data?.sections ?? [];
}
