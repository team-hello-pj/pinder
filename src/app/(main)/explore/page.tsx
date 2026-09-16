import type { Metadata } from 'next';

import { ExploreClient } from './ExploreClient';

export const metadata: Metadata = { title: '여행지 탐색' };

export default function ExplorePage() {
  return <ExploreClient />;
}
