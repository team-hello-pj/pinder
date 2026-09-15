import type { Metadata } from 'next';

import { MyRoutesClient } from './MyRoutesClient';

export const metadata: Metadata = { title: '내 일정' };

export default function MyRoutesPage() {
  return <MyRoutesClient />;
}
