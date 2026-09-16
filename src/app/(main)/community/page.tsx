import type { Metadata } from 'next';

import { CommunityClient } from './CommunityClient';

export const metadata: Metadata = { title: '커뮤니티' };

export default function CommunityPage() {
  return <CommunityClient />;
}
