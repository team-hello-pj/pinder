'use client';

import type { Place, TransportMode } from '@/types';

/** 탐색(Explore) 여행지 API 래퍼 (`/api/explore/destinations`). */

export interface Destination {
  id: string;
  name: string;
  region: string;
  badge: string;
  desc: string;
  tags: string[];
  hasRoute: boolean;
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

export interface DestinationRoute {
  places: Place[];
  segments: TransportMode[];
}

/** "이 여행지로 일정 짜기"에서 쓸, 미리 만들어 둔 동선을 가져온다. 없으면 null. */
export async function getDestinationRoute(id: string): Promise<DestinationRoute | null> {
  const res = await fetch(`/api/explore/destinations/${id}`);
  if (!res.ok) return null;
  return res.json().catch(() => null);
}
