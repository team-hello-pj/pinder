import { NextResponse } from 'next/server';

import { db } from '@/db/client';
import { posts } from '@/db/schema';
import { listPosts } from '@/lib/server/community';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSessionUser();
  const list = await listPosts(session?.id ?? null);
  return NextResponse.json({ posts: list });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { place, region, caption, tags } = ((await request.json().catch(() => null)) ?? {}) as {
    place?: string;
    region?: string;
    caption?: string;
    tags?: string[];
  };
  if (!place?.trim() || !region?.trim() || !caption?.trim()) {
    return NextResponse.json({ error: '여행지와 감상평을 입력해주세요.' }, { status: 400 });
  }

  await db.insert(posts).values({
    authorId: session.id,
    place: place.trim(),
    region: region.trim(),
    caption: caption.trim(),
    tags: Array.isArray(tags) ? tags : [],
  });

  const list = await listPosts(session.id);
  return NextResponse.json({ posts: list });
}
