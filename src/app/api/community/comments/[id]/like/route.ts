import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { postCommentLikes } from '@/db/schema';
import { listPosts } from '@/lib/server/community';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const [existing] = await db
    .select({ id: postCommentLikes.id })
    .from(postCommentLikes)
    .where(and(eq(postCommentLikes.commentId, id), eq(postCommentLikes.userId, session.id)))
    .limit(1);

  if (existing) {
    await db.delete(postCommentLikes).where(eq(postCommentLikes.id, existing.id));
  } else {
    await db.insert(postCommentLikes).values({ commentId: id, userId: session.id });
  }

  const list = await listPosts(session.id);
  return NextResponse.json({ posts: list });
}
