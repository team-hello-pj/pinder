import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { posts } from '@/db/schema';
import { listPosts } from '@/lib/server/community';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { place, region, caption, tags } = ((await request.json().catch(() => null)) ?? {}) as {
    place?: string;
    region?: string;
    caption?: string;
    tags?: string[];
  };
  if (!place?.trim() || !caption?.trim()) {
    return NextResponse.json({ error: '여행지와 감상평을 입력해주세요.' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    place: place.trim(),
    caption: caption.trim(),
    updatedAt: new Date(),
  };
  if (region?.trim()) patch.region = region.trim();
  if (Array.isArray(tags)) patch.tags = tags;

  const result = await db
    .update(posts)
    .set(patch)
    .where(and(eq(posts.id, id), eq(posts.authorId, session.id)))
    .returning({ id: posts.id });
  if (result.length === 0) {
    return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 });
  }

  const list = await listPosts(session.id);
  return NextResponse.json({ posts: list });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const result = await db
    .delete(posts)
    .where(and(eq(posts.id, id), eq(posts.authorId, session.id)))
    .returning({ id: posts.id });
  if (result.length === 0) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
  }

  const list = await listPosts(session.id);
  return NextResponse.json({ posts: list });
}
