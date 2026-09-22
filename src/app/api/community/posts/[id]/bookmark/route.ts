import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { postBookmarks } from '@/db/schema';
import { listPosts } from '@/lib/server/community';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const [existing] = await db
    .select({ id: postBookmarks.id })
    .from(postBookmarks)
    .where(and(eq(postBookmarks.postId, id), eq(postBookmarks.userId, session.id)))
    .limit(1);

  if (existing) {
    await db.delete(postBookmarks).where(eq(postBookmarks.id, existing.id));
  } else {
    await db.insert(postBookmarks).values({ postId: id, userId: session.id });
  }

  // 목록 응답과 마찬가지로 사진 원본은 빼고 imageCount만 내려준다 — 그대로 두면 북마크를
  // 누를 때마다 전체 게시물의 사진(최대 수십 MB)을 다시 내려받게 된다.
  const list = await listPosts(session.id, false);
  return NextResponse.json({ posts: list });
}
